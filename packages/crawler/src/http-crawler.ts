import crypto from 'node:crypto';
import {
  assertNetworkAllowed,
  recordOutboundRequest,
  type CrawlConfig,
  type CrawlPage,
  type CrawlRedirectHop,
  type CrawlRun,
} from '@seo-partner/core';
import { CrawlRepository, type SeoDatabase } from '@seo-partner/store';
import {
  isAllowedByRobots,
  parseRobotsTxtContent,
  RateLimiter,
  type ParsedRobotsPolicy,
} from './robots-guard.js';
import {
  SsrfBlockedError,
  validateCrawlUrlAndResolveIp,
} from './ssrf-guard.js';
import { renderPageWithPlaywright } from './js-renderer.js';

export interface HttpCrawlerOptions {
  readonly projectRoot: string;
  readonly projectId: string;
  readonly startUrl: string;
  readonly store?: SeoDatabase;
  readonly resumeRunId?: string;
  readonly offline?: boolean;
  readonly maxPages?: number;
  readonly maxDepth?: number;
  readonly concurrency?: number;
  readonly rateLimitMs?: number;
  readonly maxRedirects?: number;
  readonly allowLocal?: boolean;
  readonly js?: boolean;
  readonly userAgent?: string;
  readonly dnsLookup?: (hostname: string) => Promise<ReadonlyArray<string>>;
}

export interface HttpCrawlerResult {
  readonly crawlRunId: string;
  readonly startUrl: string;
  readonly status: CrawlRun['status'];
  readonly pagesCrawled: number;
  readonly errorsCount: number;
  readonly redirectChainsCount: number;
  readonly robotsBlockedCount: number;
  readonly durationMs: number;
  readonly pages: ReadonlyArray<CrawlPage>;
}

function normalizeCrawlUrl(rawUrl: string, baseOrigin: string): string | null {
  try {
    const u = new URL(rawUrl, baseOrigin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return null;
  }
}

function extractRoutePatternFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (!u.pathname || u.pathname === '/') return '/';
    return u.pathname.endsWith('/') ? u.pathname.slice(0, -1) : u.pathname;
  } catch {
    return '/';
  }
}

function parseHttpCanonicalHeader(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = /<([^>]+)>\s*;\s*rel=["']?canonical["']?/i.exec(linkHeader);
  return match?.[1]?.trim() ?? null;
}

function extractHtmlCrawlMetadata(
  html: string,
  pageOrigin: string,
  currentUrl: string,
): {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string | null;
  htmlLang: string | null;
  openGraph: Record<string, string>;
  hreflang: Array<{ lang: string; url: string }>;
  internalLinks: string[];
} {
  const htmlLangMatch = /<html\b[^>]*\blang\s*=\s*["']([^"']*)["'][^>]*>/i.exec(html);
  const htmlLang = htmlLangMatch?.[1]?.trim() ?? null;

  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1]!.replace(/<[^>]+>/g, '').trim() : null;

  let description: string | null = null;
  let robotsMeta: string | null = null;
  const openGraph: Record<string, string> = {};

  const metaRegex = /<meta\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRegex.exec(html)) !== null) {
    const attrs = m[1] ?? '';
    const nameMatch = /\bname\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const propMatch = /\bproperty\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const contentMatch = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(attrs);
    const contentVal = contentMatch?.[1]?.trim() ?? '';

    const nameVal = nameMatch?.[1]?.toLowerCase();
    const propVal = propMatch?.[1]?.toLowerCase();

    if (nameVal === 'description' && description === null) {
      description = contentVal;
    } else if (nameVal === 'robots' && robotsMeta === null) {
      robotsMeta = contentVal;
    }
    if (propVal && propVal.startsWith('og:')) {
      openGraph[propVal] = contentVal;
    }
  }

  let canonical: string | null = null;
  const hreflang: Array<{ lang: string; url: string }> = [];
  const linkRegex = /<link\b([^>]*)>/gi;
  while ((m = linkRegex.exec(html)) !== null) {
    const attrs = m[1] ?? '';
    const relMatch = /\brel\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const hrefMatch = /\bhref\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const hreflangMatch = /\bhreflang\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const relVal = relMatch?.[1]?.toLowerCase();
    const hrefVal = hrefMatch?.[1]?.trim();

    if (relVal === 'canonical' && hrefVal && canonical === null) {
      canonical = hrefVal;
    }
    if (relVal === 'alternate' && hreflangMatch?.[1] && hrefVal) {
      hreflang.push({ lang: hreflangMatch[1].trim(), url: hrefVal });
    }
  }

  const h1Match = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const h1 = h1Match ? h1Match[1]!.replace(/<[^>]+>/g, '').trim() : null;

  const internalLinksSet = new Set<string>();
  const aRegex = /<a\b([^>]*)>/gi;
  while ((m = aRegex.exec(html)) !== null) {
    const attrs = m[1] ?? '';
    const hrefMatch = /\bhref\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const rawHref = hrefMatch?.[1]?.trim();
    if (
      !rawHref ||
      rawHref.startsWith('#') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:') ||
      rawHref.startsWith('javascript:')
    ) {
      continue;
    }
    const resolved = normalizeCrawlUrl(rawHref, currentUrl);
    if (resolved && resolved.startsWith(pageOrigin)) {
      internalLinksSet.add(resolved);
    }
  }

  return {
    title,
    description,
    canonical,
    robotsMeta,
    h1,
    htmlLang,
    openGraph,
    hreflang,
    internalLinks: [...internalLinksSet],
  };
}

export async function runHttpCrawler(
  options: HttpCrawlerOptions,
): Promise<HttpCrawlerResult> {
  const startTime = Date.now();
  const config: CrawlConfig = {
    maxPages: options.maxPages ?? 200,
    maxDepth: options.maxDepth ?? 4,
    concurrency: Math.max(1, options.concurrency ?? 4),
    rateLimitMs: options.rateLimitMs ?? 200,
    maxRedirects: options.maxRedirects ?? 5,
    allowLocal: Boolean(options.allowLocal),
    js: Boolean(options.js),
    userAgent: options.userAgent ?? 'seo-partner-bot/0.2',
  };

  // 1. Check offline policy first (throws if --offline is true and logs to outbound.jsonl)
  assertNetworkAllowed(
    options.projectRoot,
    Boolean(options.offline),
    options.startUrl,
    'http-crawl',
  );
  recordOutboundRequest(options.projectRoot, {
    targetUrl: options.startUrl,
    method: 'GET',
    payloadBytes: 0,
    blockedByOfflineMode: false,
    purpose: 'http-crawl',
  });

  // 2. Validate start URL and resolve DNS (anti-SSRF)
  const { parsedUrl: startParsed } = await validateCrawlUrlAndResolveIp(options.startUrl, {
    allowLocal: config.allowLocal,
    dnsLookup: options.dnsLookup,
  });

  const baseOrigin = startParsed.origin;
  const normalizedStartUrl =
    normalizeCrawlUrl(startParsed.toString(), baseOrigin) ?? startParsed.toString();

  const crawlRunId =
    options.resumeRunId ??
    `crawl_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const startedAt = new Date().toISOString();

  const crawlRepo = options.store ? new CrawlRepository(options.store) : null;
  if (crawlRepo) {
    const existingRun = options.resumeRunId
      ? crawlRepo.getCrawlRunById(options.resumeRunId)
      : null;
    if (!existingRun) {
      crawlRepo.createCrawlRun({
        id: crawlRunId,
        projectId: options.projectId,
        startUrl: normalizedStartUrl,
        config,
        status: 'running',
        pagesCrawled: 0,
        errorsCount: 0,
        startedAt,
        completedAt: null,
      });
    } else {
      crawlRepo.updateCrawlRunStatus(
        crawlRunId,
        'running',
        existingRun.pagesCrawled,
        existingRun.errorsCount,
        null,
      );
    }
  }

  const rateLimiter = new RateLimiter(config.rateLimitMs);

  // 3. Fetch robots.txt & sitemap.xml
  let robotsPolicy: ParsedRobotsPolicy = parseRobotsTxtContent('');
  try {
    const robotsUrl = `${baseOrigin}/robots.txt`;
    await validateCrawlUrlAndResolveIp(robotsUrl, {
      allowLocal: config.allowLocal,
      dnsLookup: options.dnsLookup,
    });
    const robotsRes = await fetch(robotsUrl, {
      headers: { 'User-Agent': config.userAgent },
      redirect: 'manual',
    });
    if (robotsRes.status >= 200 && robotsRes.status < 300) {
      const txt = await robotsRes.text();
      robotsPolicy = parseRobotsTxtContent(txt);
    }
  } catch (err) {
    if (err instanceof SsrfBlockedError) throw err;
  }

  const sitemapSeedUrls: string[] = [];
  const sitemapCandidates = new Set<string>([
    `${baseOrigin}/sitemap.xml`,
    ...robotsPolicy.sitemaps.filter((s) => s.startsWith(baseOrigin)),
  ]);

  for (const smUrl of sitemapCandidates) {
    try {
      await validateCrawlUrlAndResolveIp(smUrl, {
        allowLocal: config.allowLocal,
        dnsLookup: options.dnsLookup,
      });
      const smRes = await fetch(smUrl, {
        headers: { 'User-Agent': config.userAgent },
        redirect: 'manual',
      });
      if (smRes.status >= 200 && smRes.status < 300) {
        const xml = await smRes.text();
        const locRegex = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
        let locMatch: RegExpExecArray | null;
        while ((locMatch = locRegex.exec(xml)) !== null) {
          const normalizedLoc = normalizeCrawlUrl(locMatch[1] ?? '', baseOrigin);
          if (normalizedLoc && normalizedLoc.startsWith(baseOrigin)) {
            sitemapSeedUrls.push(normalizedLoc);
          }
        }
      }
    } catch (err) {
      if (err instanceof SsrfBlockedError) throw err;
    }
  }

  // 4. Initialize BFS queue (supporting --resume)
  const visitedUrls = new Set<string>();
  const crawledPagesMap = new Map<string, CrawlPage>();
  const queue: Array<{ url: string; depth: number }> = [];

  if (options.resumeRunId && crawlRepo) {
    const existingPages = crawlRepo.getCrawlPages(options.resumeRunId);
    for (const p of existingPages) {
      visitedUrls.add(p.url);
      crawledPagesMap.set(p.url, p);
      for (const link of p.internalLinks) {
        if (!visitedUrls.has(link) && p.depth + 1 <= config.maxDepth) {
          queue.push({ url: link, depth: p.depth + 1 });
        }
      }
    }
  }

  if (!visitedUrls.has(normalizedStartUrl)) {
    queue.push({ url: normalizedStartUrl, depth: 0 });
  }
  for (const smSeed of sitemapSeedUrls) {
    if (!visitedUrls.has(smSeed)) {
      queue.push({ url: smSeed, depth: 1 });
    }
  }

  let robotsBlockedCount = 0;

  async function crawlSingleItem(item: { url: string; depth: number }): Promise<void> {
    const parsedTarget = new URL(item.url);
    if (!isAllowedByRobots(robotsPolicy, parsedTarget.pathname, config.userAgent)) {
      robotsBlockedCount += 1;
      return;
    }

    await rateLimiter.waitForSlot(parsedTarget.hostname);

    const reqStart = Date.now();
    const redirectChain: CrawlRedirectHop[] = [];
    let currentFetchUrl = item.url;
    let statusCode = 0;
    let xRobotsTag: string | null = null;
    let httpCanonical: string | null = null;
    let htmlBody = '';

    if (config.js) {
      await validateCrawlUrlAndResolveIp(currentFetchUrl, {
        allowLocal: config.allowLocal,
        dnsLookup: options.dnsLookup,
      });
      const jsRes = await renderPageWithPlaywright(currentFetchUrl, config.userAgent);
      statusCode = jsRes.statusCode;
      htmlBody = jsRes.html;
      xRobotsTag = jsRes.headers['x-robots-tag'] ?? null;
      httpCanonical = parseHttpCanonicalHeader(jsRes.headers['link'] ?? null);
    } else {
      let hops = 0;
      while (hops <= config.maxRedirects) {
        await validateCrawlUrlAndResolveIp(currentFetchUrl, {
          allowLocal: config.allowLocal,
          dnsLookup: options.dnsLookup,
        });

        const res = await fetch(currentFetchUrl, {
          headers: {
            'User-Agent': config.userAgent,
            Accept: 'text/html,application/xhtml+xml',
          },
          redirect: 'manual',
        });

        statusCode = res.status;
        xRobotsTag = res.headers.get('x-robots-tag');
        httpCanonical = parseHttpCanonicalHeader(res.headers.get('link'));

        if (statusCode >= 300 && statusCode < 400) {
          const location = res.headers.get('location');
          if (!location) break;
          const nextUrl = new URL(location, currentFetchUrl).toString();
          redirectChain.push({
            from: currentFetchUrl,
            to: nextUrl,
            status: statusCode,
          });
          currentFetchUrl = nextUrl;
          hops += 1;
          if (hops > config.maxRedirects) {
            break;
          }
          continue;
        }

        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml') || contentType === '') {
          htmlBody = await res.text();
        }
        break;
      }
    }

    const responseTimeMs = Math.max(1, Date.now() - reqStart);
    const meta = htmlBody
      ? extractHtmlCrawlMetadata(htmlBody, baseOrigin, currentFetchUrl)
      : {
          title: null,
          description: null,
          canonical: null,
          robotsMeta: null,
          h1: null,
          htmlLang: null,
          openGraph: {},
          hreflang: [],
          internalLinks: [],
        };

    const pageRecord: CrawlPage = {
      crawlRunId,
      url: item.url,
      routePattern: extractRoutePatternFromUrl(item.url),
      statusCode,
      redirectChain,
      responseTimeMs,
      depth: item.depth,
      xRobotsTag,
      httpCanonical,
      title: meta.title,
      description: meta.description,
      canonical: meta.canonical,
      robotsMeta: meta.robotsMeta,
      h1: meta.h1,
      htmlLang: meta.htmlLang,
      openGraph: meta.openGraph,
      hreflang: meta.hreflang,
      internalLinks: meta.internalLinks,
      brokenLinks: [],
      untrustedExternal: true,
      crawledAt: new Date().toISOString(),
    };

    crawledPagesMap.set(item.url, pageRecord);
    if (crawlRepo) {
      crawlRepo.upsertCrawlPage(pageRecord);
    }

    if (item.depth < config.maxDepth) {
      for (const nextLink of meta.internalLinks) {
        if (!visitedUrls.has(nextLink)) {
          queue.push({ url: nextLink, depth: item.depth + 1 });
        }
      }
    }
  }

  while (queue.length > 0 && crawledPagesMap.size < config.maxPages) {
    const batch: Array<{ url: string; depth: number }> = [];
    while (
      queue.length > 0 &&
      batch.length < config.concurrency &&
      crawledPagesMap.size + batch.length < config.maxPages
    ) {
      const next = queue.shift()!;
      if (visitedUrls.has(next.url)) continue;
      visitedUrls.add(next.url);
      batch.push(next);
    }

    if (batch.length === 0) break;
    await Promise.all(batch.map((b) => crawlSingleItem(b)));
  }

  // 5. Post-process broken internal links across crawled pages
  const statusByUrl = new Map<string, number>();
  for (const [u, p] of crawledPagesMap.entries()) {
    statusByUrl.set(u, p.statusCode);
  }

  const finalPages: CrawlPage[] = [];
  let errorsCount = 0;
  let redirectChainsCount = 0;

  for (const p of crawledPagesMap.values()) {
    if (p.statusCode >= 400) {
      errorsCount += 1;
    }
    if (p.redirectChain.length >= 2) {
      redirectChainsCount += 1;
    }
    const brokenLinks = p.internalLinks.filter((lnk) => {
      const st = statusByUrl.get(lnk);
      return st !== undefined && st >= 400;
    });
    const updatedPage: CrawlPage =
      brokenLinks.length > 0 ? { ...p, brokenLinks } : p;
    finalPages.push(updatedPage);
    if (brokenLinks.length > 0 && crawlRepo) {
      crawlRepo.upsertCrawlPage(updatedPage);
    }
  }

  const completedAt = new Date().toISOString();
  if (crawlRepo) {
    crawlRepo.updateCrawlRunStatus(
      crawlRunId,
      'completed',
      finalPages.length,
      errorsCount,
      completedAt,
    );
  }

  return {
    crawlRunId,
    startUrl: normalizedStartUrl,
    status: 'completed',
    pagesCrawled: finalPages.length,
    errorsCount,
    redirectChainsCount,
    robotsBlockedCount,
    durationMs: Date.now() - startTime,
    pages: finalPages,
  };
}
