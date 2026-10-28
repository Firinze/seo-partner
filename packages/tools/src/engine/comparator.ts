import type {
  CodeVsCrawlComparisonRow,
  CodeVsCrawlDivergence,
  CrawlPage,
  ExtractedRouteData,
} from '@seo-partner/core';

export function extractPathnameNormalized(rawUrlOrPath: string): string {
  const trimmed = rawUrlOrPath.trim();
  if (trimmed.startsWith('/')) {
    const noQuery = trimmed.split('?')[0]?.split('#')[0] ?? '/';
    return noQuery.length > 1 && noQuery.endsWith('/') ? noQuery.slice(0, -1) : noQuery;
  }
  try {
    const parsed = new URL(trimmed);
    const p = parsed.pathname || '/';
    return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
  } catch {
    return trimmed;
  }
}

export function compareCodeVsCrawl(
  routes: ReadonlyArray<ExtractedRouteData>,
  crawlPages: ReadonlyArray<CrawlPage>,
): ReadonlyArray<CodeVsCrawlComparisonRow> {
  const routeByPattern = new Map<string, ExtractedRouteData>();
  for (const r of routes) {
    routeByPattern.set(r.route.pattern, r);
  }

  const crawlByPattern = new Map<string, CrawlPage>();
  for (const cp of crawlPages) {
    crawlByPattern.set(cp.routePattern, cp);
  }

  const allPatterns = new Set<string>([
    ...routeByPattern.keys(),
    ...crawlByPattern.keys(),
  ]);

  const rows: CodeVsCrawlComparisonRow[] = [];

  for (const pattern of [...allPatterns].sort()) {
    const codeItem = routeByPattern.get(pattern) ?? null;
    const crawlItem = crawlByPattern.get(pattern) ?? null;
    const divergences: CodeVsCrawlDivergence[] = [];

    const codeTitle = codeItem?.title?.value.trim() ?? null;
    const codeDesc = codeItem?.description?.value.trim() ?? null;
    const codeCanonical = codeItem?.canonical?.value.trim() ?? null;
    const codeRobots = codeItem?.robots?.value.trim() ?? null;
    const codeH1 = codeItem?.headings.find((h) => h.level === 1)?.text.trim() ?? null;
    const codeLang = codeItem?.htmlLang?.value.trim() ?? null;

    const crawlCanonical = crawlItem
      ? (crawlItem.httpCanonical ?? crawlItem.canonical)
      : null;

    if (crawlItem && crawlItem.statusCode >= 400) {
      divergences.push({
        field: 'status',
        codeValue: codeItem ? '200 (route declared)' : null,
        crawlValue: `HTTP ${crawlItem.statusCode}`,
        severity: 'critical',
      });
    }

    if (codeCanonical && crawlCanonical) {
      const p1 = extractPathnameNormalized(codeCanonical);
      const p2 = extractPathnameNormalized(crawlCanonical);
      if (p1 !== p2) {
        divergences.push({
          field: 'canonical',
          codeValue: codeCanonical,
          crawlValue: crawlCanonical,
          severity: 'high',
        });
      }
    }

    if (codeTitle && crawlItem?.title && codeTitle !== crawlItem.title.trim()) {
      divergences.push({
        field: 'title',
        codeValue: codeTitle,
        crawlValue: crawlItem.title.trim(),
        severity: 'medium',
      });
    }

    if (codeH1 && crawlItem?.h1 && codeH1 !== crawlItem.h1.trim()) {
      divergences.push({
        field: 'h1',
        codeValue: codeH1,
        crawlValue: crawlItem.h1.trim(),
        severity: 'medium',
      });
    }

    if (crawlItem?.xRobotsTag && /\bnoindex\b/i.test(crawlItem.xRobotsTag)) {
      if (!codeRobots || !/\bnoindex\b/i.test(codeRobots)) {
        divergences.push({
          field: 'robots',
          codeValue: codeRobots ?? 'index, follow',
          crawlValue: `X-Robots-Tag: ${crawlItem.xRobotsTag}`,
          severity: 'critical',
        });
      }
    }

    if (codeLang && crawlItem?.htmlLang && codeLang !== crawlItem.htmlLang.trim()) {
      divergences.push({
        field: 'htmlLang',
        codeValue: codeLang,
        crawlValue: crawlItem.htmlLang.trim(),
        severity: 'low',
      });
    }

    rows.push({
      routePattern: pattern,
      filePath: codeItem?.route.filePath ?? null,
      crawledUrl: crawlItem?.url ?? null,
      statusCode: crawlItem?.statusCode ?? null,
      responseTimeMs: crawlItem?.responseTimeMs ?? null,
      redirectHops: crawlItem?.redirectChain.length ?? 0,
      code: codeItem
        ? {
            title: codeTitle,
            description: codeDesc,
            canonical: codeCanonical,
            robots: codeRobots,
            h1: codeH1,
            htmlLang: codeLang,
          }
        : null,
      crawl: crawlItem
        ? {
            title: crawlItem.title,
            description: crawlItem.description,
            canonical: crawlCanonical,
            xRobotsTag: crawlItem.xRobotsTag,
            robotsMeta: crawlItem.robotsMeta,
            h1: crawlItem.h1,
            htmlLang: crawlItem.htmlLang,
            brokenLinksCount: crawlItem.brokenLinks.length,
          }
        : null,
      divergences,
    });
  }

  return rows;
}
