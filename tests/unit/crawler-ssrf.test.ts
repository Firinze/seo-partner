import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CrawlPage } from '@seo-partner/core';
import {
  isAllowedByRobots,
  isPrivateOrReservedIp,
  parseRobotsTxtContent,
  runHttpCrawler,
  SsrfBlockedError,
  validateCrawlUrlAndResolveIp,
} from '@seo-partner/crawler';
import { CrawlRepository, ProjectRepository, SeoDatabase } from '@seo-partner/store';
import { executeCli } from 'seo-partner';

describe('HTTP Crawler, Anti-SSRF Guard & robots.txt Compliance', () => {
  const tempDirs: string[] = [];

  function createTempProject(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-crawler-test-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('blocks private/loopback IPs, Laragon .test domains, and cloud metadata by default (anti-SSRF)', async () => {
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.16.5.4')).toBe(true);
    expect(isPrivateOrReservedIp('192.168.1.10')).toBe(true);
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
    expect(isPrivateOrReservedIp('::1')).toBe(true);
    expect(isPrivateOrReservedIp('fc00::1')).toBe(true);
    expect(isPrivateOrReservedIp('fe80::1')).toBe(true);
    expect(isPrivateOrReservedIp('93.184.216.34')).toBe(false);

    await expect(
      validateCrawlUrlAndResolveIp('http://127.0.0.1:8080/'),
    ).rejects.toBeInstanceOf(SsrfBlockedError);

    await expect(
      validateCrawlUrlAndResolveIp('http://mon-app.test/'),
    ).rejects.toBeInstanceOf(SsrfBlockedError);

    await expect(
      validateCrawlUrlAndResolveIp('https://rebind.example.com/', {
        allowLocal: false,
        dnsLookup: async () => ['10.24.0.5'],
      }),
    ).rejects.toBeInstanceOf(SsrfBlockedError);

    // Cloud metadata IP 169.254.169.254 is blocked EVEN when allowLocal: true
    await expect(
      validateCrawlUrlAndResolveIp('http://169.254.169.254/latest/meta-data/', {
        allowLocal: true,
      }),
    ).rejects.toBeInstanceOf(SsrfBlockedError);

    // Laragon .test domain succeeds when allowLocal: true
    const allowed = await validateCrawlUrlAndResolveIp('http://mon-app.test/', {
      allowLocal: true,
      dnsLookup: async () => ['127.0.0.1'],
    });
    expect(allowed.resolvedIps).toContain('127.0.0.1');
  });

  it('parses and enforces robots.txt Allow/Disallow and AI bot policies', () => {
    const policy = parseRobotsTxtContent(`
      User-agent: *
      Disallow: /private-crawl
      Allow: /private-crawl/public-doc
      Sitemap: http://127.0.0.1/sitemap.xml

      User-agent: GPTBot
      Disallow: /
    `);

    expect(isAllowedByRobots(policy, '/')).toBe(true);
    expect(isAllowedByRobots(policy, '/private-crawl/secret')).toBe(false);
    expect(isAllowedByRobots(policy, '/private-crawl/public-doc')).toBe(true);
    expect(policy.blockedAiBots).toContain('gptbot');
    expect(policy.blocksAllBots).toBe(false);
  });

  it('crawls a local HTTP server with --allow-local, respects robots.txt, records redirects and 404s, and supports --resume', async () => {
    const projectRoot = createTempProject();
    let privateCrawlHit = 0;
    const baseUrl = 'http://127.0.0.1:43210';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const targetStr = typeof input === 'string' ? input : input.toString();
      const parsed = new URL(targetStr);
      const url = parsed.pathname;
      const base = parsed.origin;

      if (url === '/robots.txt') {
        return new Response(
          `User-agent: *\nDisallow: /private-crawl\nSitemap: ${base}/sitemap.xml\n`,
          { status: 200, headers: { 'Content-Type': 'text/plain' } },
        );
      }

      if (url === '/sitemap.xml') {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>${base}/</loc></url><url><loc>${base}/old-chain</loc></url></urlset>`,
          { status: 200, headers: { 'Content-Type': 'application/xml' } },
        );
      }

      if (url === '/private-crawl') {
        privateCrawlHit += 1;
        return new Response('<html><body>Private</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (url === '/') {
        return new Response(
          `<!DOCTYPE html>
          <html lang="fr">
          <head>
            <title>Accueil Serveur Local</title>
            <meta name="description" content="Description de la page d accueil">
            <link rel="canonical" href="${base}/">
            <meta property="og:title" content="Accueil OG">
          </head>
          <body>
            <h1>Bienvenue sur le Serveur Local</h1>
            <a href="/private-crawl">Zone privee</a>
            <a href="/noindex-header">Page avec X-Robots-Tag</a>
            <a href="/missing-404">Lien casse</a>
          </body>
          </html>`,
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              Link: `<${base}/>; rel="canonical"`,
            },
          },
        );
      }

      if (url === '/old-chain') {
        return new Response('', {
          status: 301,
          headers: { Location: '/mid-chain' },
        });
      }

      if (url === '/mid-chain') {
        return new Response('', {
          status: 302,
          headers: { Location: '/final-dest' },
        });
      }

      if (url === '/final-dest') {
        return new Response(
          '<html lang="fr"><head><title>Destination Finale</title></head><body><h1>Arrivee</h1></body></html>',
          { status: 200, headers: { 'Content-Type': 'text/html' } },
        );
      }

      if (url === '/noindex-header') {
        return new Response(
          '<html lang="fr"><head><title>Page Noindex</title></head><body><h1>Noindex Header</h1></body></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'X-Robots-Tag': 'noindex, nofollow',
            },
          },
        );
      }

      return new Response(
        '<html><head><title>404 Not Found</title></head><body><h1>404</h1></body></html>',
        { status: 404, headers: { 'Content-Type': 'text/html' } },
      );
    });

    // 1. CLI call without --allow-local MUST fail with exitCode 3
    const blockedCli = await executeCli(['crawl', baseUrl, '--cwd', projectRoot, '--json']);
    expect(blockedCli.exitCode).toBe(3);

    // 2. CLI call with --offline MUST fail with exitCode 3
    const offlineCli = await executeCli([
      'crawl',
      baseUrl,
      '--allow-local',
      '--offline',
      '--cwd',
      projectRoot,
      '--json',
    ]);
    expect(offlineCli.exitCode).toBe(3);

    // 3. Crawl with allowLocal: true
    const store = SeoDatabase.open(projectRoot);
    try {
      const projectRepo = new ProjectRepository(store);
      projectRepo.upsertProject({
        id: 'proj_crawl',
        rootPath: projectRoot,
        name: 'crawl-test',
        frameworks: [],
        hasRobotsTxt: true,
        hasSitemap: true,
        createdAt: new Date().toISOString(),
        lastScannedAt: null,
      });

      const crawlRes = await runHttpCrawler({
        projectRoot,
        projectId: 'proj_crawl',
        startUrl: baseUrl,
        store,
        allowLocal: true,
        rateLimitMs: 5,
      });

      expect(privateCrawlHit).toBe(0);
      expect(crawlRes.robotsBlockedCount).toBeGreaterThanOrEqual(1);
      expect(crawlRes.pagesCrawled).toBe(4);
      expect(crawlRes.errorsCount).toBe(1);
      expect(crawlRes.redirectChainsCount).toBe(1);

      const homePage = crawlRes.pages.find((p: CrawlPage) => p.routePattern === '/');
      expect(homePage?.title).toBe('Accueil Serveur Local');
      expect(homePage?.htmlLang).toBe('fr');
      expect(homePage?.brokenLinks).toContain(`${baseUrl}/missing-404`);
      expect(homePage?.untrustedExternal).toBe(true);

      const chainPage = crawlRes.pages.find((p: CrawlPage) => p.routePattern === '/old-chain');
      expect(chainPage?.redirectChain.length).toBe(2);
      expect(chainPage?.statusCode).toBe(200);

      const noindexPage = crawlRes.pages.find(
        (p: CrawlPage) => p.routePattern === '/noindex-header',
      );
      expect(noindexPage?.xRobotsTag).toContain('noindex');

      // Verify persistence in CrawlRepository and --resume support
      const crawlRepo = new CrawlRepository(store);
      const savedRun = crawlRepo.getLatestCompletedCrawlRun('proj_crawl');
      expect(savedRun?.id).toBe(crawlRes.crawlRunId);

      const resumedRes = await runHttpCrawler({
        projectRoot,
        projectId: 'proj_crawl',
        startUrl: baseUrl,
        store,
        resumeRunId: crawlRes.crawlRunId,
        allowLocal: true,
        rateLimitMs: 0,
      });
      expect(resumedRes.pagesCrawled).toBe(4);
    } finally {
      store.close();
    }
  });
});

