import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiErrorData, ApiResponseEnvelope, DashboardOverview } from '@seo-partner/core';
import { CrawlRepository, SeoDatabase } from '@seo-partner/store';
import {
  compareCodeVsCrawl,
  createLocalApiApp,
  SESSION_COOKIE_NAME,
  startLocalServer,
} from '@seo-partner/server';

describe('Local API Server (@seo-partner/server) — OpenAPI 3.1, RFC 9457, Security & Port Fallback', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-server-test-'));
    fs.mkdirSync(path.join(tmpDir, 'app'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-next-app', dependencies: { next: '15.0.0' } }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(tmpDir, 'app', 'page.tsx'),
      `
export const metadata = {
  title: 'Accueil — SEO Partner Local Test',
  description: 'Description officielle de la page accueil pour le test du serveur local.',
  alternates: { canonical: 'https://example.com/' },
};
export default function HomePage() {
  return <main><html lang="fr"><body><h1>Bienvenue sur SEO Partner</h1></body></html></main>;
}
      `.trim(),
      'utf-8',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('serves OpenAPI 3.1.0 spec, health check, and initializes HttpOnly session cookie', async () => {
    const app = createLocalApiApp({ projectRoot: tmpDir, port: 4321, defaultLang: 'fr' });

    const healthRes = await app.request('/api/v1/health');
    expect(healthRes.status).toBe(200);
    const healthJson = (await healthRes.json()) as ApiResponseEnvelope<{
      status: string;
      version: string;
      host: string;
      port: number;
    }>;
    expect(healthJson.success).toBe(true);
    expect(healthJson.data.host).toBe('127.0.0.1');
    expect(healthJson.data.port).toBe(4321);
    expect(healthJson.error).toBeNull();

    const openApiRes = await app.request('/api/v1/openapi.json');
    expect(openApiRes.status).toBe(200);
    const openApiJson = (await openApiRes.json()) as ApiResponseEnvelope<{
      openapi: string;
      paths: Record<string, unknown>;
    }>;
    expect(openApiJson.data.openapi).toBe('3.1.0');
    expect(Object.keys(openApiJson.data.paths).length).toBeGreaterThanOrEqual(13);

    const sessionRes = await app.request('/api/v1/session');
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
  });

  it('rejects non-loopback Host headers and untrusted Origin headers with 403 RFC 9457 ProblemDetails', async () => {
    const app = createLocalApiApp({ projectRoot: tmpDir, port: 4321 });

    const badHostRes = await app.request('http://127.0.0.1:4321/api/v1/health', {
      headers: { Host: 'evil-rebind.attacker.com' },
    });
    expect(badHostRes.status).toBe(403);
    expect(badHostRes.headers.get('content-type')).toContain('application/problem+json');
    const badHostBody = (await badHostRes.json()) as ApiResponseEnvelope<ApiErrorData>;
    expect(badHostBody.success).toBe(false);
    expect(badHostBody.data.problem.status).toBe(403);
    expect(badHostBody.data.problem.type).toContain('forbidden-host');

    const badOriginRes = await app.request('http://127.0.0.1:4321/api/v1/overview', {
      headers: { Origin: 'https://malicious.example.com' },
    });
    expect(badOriginRes.status).toBe(403);
    const badOriginBody = (await badOriginRes.json()) as ApiResponseEnvelope<ApiErrorData>;
    expect(badOriginBody.success).toBe(false);
    expect(badOriginBody.data.problem.type).toContain('forbidden-origin');
  });

  it('enforces HttpOnly session cookie on all mutating POST endpoints (401 without cookie, 200 with cookie)', async () => {
    const app = createLocalApiApp({ projectRoot: tmpDir, port: 4321 });

    // Without session cookie -> 401 RFC 9457
    const unauthScan = await app.request('/api/v1/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(unauthScan.status).toBe(401);
    const unauthBody = (await unauthScan.json()) as ApiResponseEnvelope<ApiErrorData>;
    expect(unauthBody.success).toBe(false);
    expect(unauthBody.data.problem.status).toBe(401);

    // Fetch session cookie from GET /
    const rootRes = await app.request('/?lang=fr');
    expect(rootRes.status).toBe(200);
    const html = await rootRes.text();
    expect(html).toContain('SEO');
    const cookieHeader = (rootRes.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

    // With session cookie -> 200 OK
    const authScan = await app.request('/api/v1/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ rebuild: true }),
    });
    expect(authScan.status).toBe(200);
    const scanBody = (await authScan.json()) as ApiResponseEnvelope<{
      routesDiscovered: number;
      totalFindings: number;
    }>;
    expect(scanBody.success).toBe(true);
    expect(scanBody.data.routesDiscovered).toBeGreaterThanOrEqual(1);

    // Verify overview, routes, FTS5 search, findings, backlog, decisions, and reports
    const overviewRes = await app.request('/api/v1/overview');
    const overviewJson = (await overviewRes.json()) as ApiResponseEnvelope<DashboardOverview>;
    expect(overviewJson.data.stats.routesCount).toBeGreaterThanOrEqual(1);

    const searchRes = await app.request('/api/v1/search?q=Bienvenue');
    expect(searchRes.status).toBe(200);
    const searchJson = (await searchRes.json()) as ApiResponseEnvelope<{
      durationMs: number;
      results: ReadonlyArray<{ routePattern: string }>;
    }>;
    expect(searchJson.data.durationMs).toBeLessThan(100);
    expect(searchJson.data.results.some((r) => r.routePattern === '/')).toBe(true);

    // Invalid search query -> 422 RFC 9457
    const badSearchRes = await app.request('/api/v1/search?q=');
    expect(badSearchRes.status).toBe(422);

    // Backlog prioritizes indexing blockers first (F-R3)
    const backlogRes = await app.request('/api/v1/backlog');
    expect(backlogRes.status).toBe(200);
    const backlogJson = (await backlogRes.json()) as ApiResponseEnvelope<{
      total: number;
      items: ReadonlyArray<{ blocksIndexing: boolean; ice: { score: number } }>;
    }>;
    expect(backlogJson.data.total).toBeGreaterThan(0);
    const firstNonBlockingIdx = backlogJson.data.items.findIndex((i) => !i.blocksIndexing);
    if (firstNonBlockingIdx > 0) {
      expect(backlogJson.data.items[0]?.blocksIndexing).toBe(true);
    }

    // Create decision via POST /api/v1/decisions
    const decRes = await app.request('/api/v1/decisions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        title: 'Conserver /admin hors sitemap',
        rationale: 'Protection des routes privees.',
      }),
    });
    expect(decRes.status).toBe(200);
    expect(fs.existsSync(path.join(tmpDir, '.seo', 'decisions.md'))).toBe(true);

    // Generate HTML report via POST /api/v1/reports
    const repRes = await app.request('/api/v1/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ format: 'html', reportType: 'audit-complet', lang: 'fr' }),
    });
    expect(repRes.status).toBe(200);
    const repJson = (await repRes.json()) as ApiResponseEnvelope<{
      filePath: string;
      content: string;
    }>;
    expect(fs.existsSync(repJson.data.filePath)).toBe(true);
    expect(repJson.data.content).toContain('<!DOCTYPE html>');
  });

  it('blocks SSRF on POST /api/v1/crawls when allowLocal is false and computes Code vs Crawl divergences', async () => {
    const app = createLocalApiApp({ projectRoot: tmpDir, port: 4321 });
    const sessionToken = app.getSessionToken();

    await app.request('/api/v1/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Seo-Partner-Session': sessionToken,
      },
      body: JSON.stringify({}),
    });

    // Attempt to crawl 127.0.0.1 without allowLocal -> 403 SSRF blocked
    const ssrfRes = await app.request('/api/v1/crawls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Seo-Partner-Session': sessionToken,
      },
      body: JSON.stringify({ startUrl: 'http://127.0.0.1:8080/', allowLocal: false }),
    });
    expect(ssrfRes.status).toBe(403);
    const ssrfBody = (await ssrfRes.json()) as ApiResponseEnvelope<ApiErrorData>;
    expect(ssrfBody.data.problem.type).toContain('ssrf-blocked');

    // Insert a crawled page with divergent canonical, title, and X-Robots-Tag: noindex to verify /api/v1/crawls/latest/compare
    const store = SeoDatabase.open(tmpDir);
    try {
      const crawlRepo = new CrawlRepository(store);
      const overviewRes = await app.request('/api/v1/overview');
      const overview = ((await overviewRes.json()) as ApiResponseEnvelope<DashboardOverview>).data;
      const projectId = overview.project!.id;

      crawlRepo.createCrawlRun({
        id: 'crawl_test_compare',
        projectId,
        startUrl: 'http://127.0.0.1:8080/',
        config: {
          maxPages: 10,
          maxDepth: 2,
          concurrency: 2,
          rateLimitMs: 0,
          maxRedirects: 3,
          allowLocal: true,
          js: false,
          userAgent: 'seo-partner-test',
        },
        status: 'completed',
        pagesCrawled: 1,
        errorsCount: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      crawlRepo.upsertCrawlPage({
        crawlRunId: 'crawl_test_compare',
        url: 'http://127.0.0.1:8080/',
        routePattern: '/',
        statusCode: 200,
        redirectChain: [],
        responseTimeMs: 12,
        depth: 0,
        xRobotsTag: 'noindex',
        httpCanonical: 'https://example.com/autre-canonique',
        title: 'Titre modifie cote serveur HTTP',
        description: null,
        canonical: 'https://example.com/autre-canonique',
        robotsMeta: null,
        h1: 'H1 different en rendu HTTP',
        htmlLang: 'en',
        openGraph: {},
        hreflang: [],
        internalLinks: [],
        brokenLinks: [],
        untrustedExternal: true,
        crawledAt: new Date().toISOString(),
      });
    } finally {
      store.close();
    }

    const compareRes = await app.request('/api/v1/crawls/latest/compare');
    expect(compareRes.status).toBe(200);
    const compareJson = (await compareRes.json()) as ApiResponseEnvelope<{
      divergentRowsCount: number;
      rows: ReturnType<typeof compareCodeVsCrawl>;
    }>;
    expect(compareJson.data.divergentRowsCount).toBe(1);
    const fields = compareJson.data.rows[0]?.divergences.map((d) => d.field) ?? [];
    expect(fields).toContain('canonical');
    expect(fields).toContain('title');
    expect(fields).toContain('h1');
    expect(fields).toContain('robots');
    expect(fields).toContain('htmlLang');
  });

  it('automatically falls back to the next free port (port + 1) when requested port is EADDRINUSE', async () => {
    const server1 = await startLocalServer({ projectRoot: tmpDir, port: 0 });
    const occupiedPort = server1.port;

    const server2 = await startLocalServer({ projectRoot: tmpDir, port: occupiedPort });
    try {
      expect(server2.requestedPort).toBe(occupiedPort);
      expect(server2.port).not.toBe(occupiedPort);
      expect(server2.port).toBeGreaterThan(0);
      expect(server2.fallbackUsed).toBe(true);
      expect(server2.host).toBe('127.0.0.1');
      expect(server2.url).toBe(`http://127.0.0.1:${server2.port}`);

      // Verify Host guard was dynamically calibrated to server2.port
      const validHostRes = await server2.app.request(
        `http://127.0.0.1:${server2.port}/api/v1/health`,
        {
          headers: { Host: `127.0.0.1:${server2.port}` },
        },
      );
      expect(validHostRes.status).toBe(200);
    } finally {
      await server2.close();
      await server1.close();
    }
  });
});
