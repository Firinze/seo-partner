import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeCli } from 'seo-partner';

const tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d && fs.existsSync(d)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  }
});

function mockLocalTestServer(): string {
  const baseUrl = 'http://127.0.0.1:43211';

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const targetStr = typeof input === 'string' ? input : input.toString();
    const parsed = new URL(targetStr);
    const url = parsed.pathname;

    if (url === '/robots.txt') {
      return new Response('User-agent: *\nAllow: /\n', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    if (url === '/') {
      return new Response(
        `<!DOCTYPE html>
<html lang="fr">
<head>
  <title>Laravel Boutique Bio — Accueil</title>
  <meta name="description" content="Découvrez notre boutique bio artisanale avec livraison rapide dans toute la France." />
  <link rel="canonical" href="http://127.0.0.1:43211/" />
</head>
<body>
  <h1>Boutique Bio Artisanale</h1>
  <a href="/catalogue">Voir le catalogue</a>
  <a href="/broken-page">Lien cassé</a>
</body>
</html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
      );
    }
    if (url === '/catalogue') {
      return new Response(
        `<!DOCTYPE html>
<html lang="fr">
<head>
  <title>Catalogue des Produits Bio</title>
</head>
<body>
  <h1>Notre Catalogue</h1>
</body>
</html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
      );
    }
    return new Response('<html><body>Not Found</body></html>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  });

  return baseUrl;
}

describe('v0.2 End-to-End Workflow Integration (Incremental Scan + Crawl + 40 Rules + HTML/JSON Reports)', () => {
  it('executes full & incremental scan -> crawl --allow-local -> audit (40 rules) -> report --format html & json on Laravel project', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-v02-laravel-'));
    tempDirs.push(tempRoot);

    const srcFixture = path.resolve('tests/fixtures/laravel-sample');
    fs.cpSync(srcFixture, tempRoot, { recursive: true });

    // 1. Initial scan (full)
    const scan1 = await executeCli(['scan', '--cwd', tempRoot, '--json']);
    expect(scan1.exitCode).toBe(0);
    const scan1Payload = JSON.parse(scan1.stdout);
    expect(scan1Payload.success).toBe(true);
    expect(scan1Payload.data.incremental).toBe(false);
    expect(scan1Payload.data.frameworks).toContain('php');
    expect(scan1Payload.data.routesDiscovered).toBeGreaterThanOrEqual(2);

    // 2. Second scan (incremental — no changes)
    const scan2 = await executeCli(['scan', '--cwd', tempRoot, '--json']);
    expect(scan2.exitCode).toBe(0);
    const scan2Payload = JSON.parse(scan2.stdout);
    expect(scan2Payload.success).toBe(true);
    expect(scan2Payload.data.incremental).toBe(true);
    expect(scan2Payload.data.filesReused).toBeGreaterThan(0);
    expect(scan2Payload.data.filesParsed).toBe(0);

    // 3. Anti-SSRF check: crawling cloud metadata must fail with exitCode 3
    const ssrfBlocked = await executeCli([
      'crawl',
      'http://169.254.169.254/latest/meta-data/',
      '--cwd',
      tempRoot,
      '--json',
    ]);
    expect(ssrfBlocked.exitCode).toBe(3);
    const ssrfPayload = JSON.parse(ssrfBlocked.stdout);
    expect(ssrfPayload.success).toBe(false);

    // 4. Start local test server mock and run crawl with --allow-local
    const baseUrl = mockLocalTestServer();
    const crawlRes = await executeCli([
      'crawl',
      baseUrl,
      '--cwd',
      tempRoot,
      '--allow-local',
      '--max-pages',
      '10',
      '--rate-limit',
      '0',
      '--json',
    ]);
    expect(crawlRes.exitCode).toBe(0);
    const crawlPayload = JSON.parse(crawlRes.stdout);
    expect(crawlPayload.success).toBe(true);
    expect(crawlPayload.data.pagesCrawled).toBeGreaterThanOrEqual(2);
    expect(crawlPayload.data.errorsCount).toBeGreaterThanOrEqual(1);

    // 5. Audit with 40 rules (combining static PHP routes and HTTP crawl results)
    const auditRes = await executeCli(['audit', '--cwd', tempRoot, '--json']);
    expect(auditRes.exitCode).toBe(0);
    const auditPayload = JSON.parse(auditRes.stdout);
    expect(auditPayload.success).toBe(true);
    expect(auditPayload.data.activeRulesCount).toBe(40);
    expect(auditPayload.data.crawlRunId).toBe(crawlPayload.data.crawlRunId);
    expect(auditPayload.data.totalFindings).toBeGreaterThan(0);

    // Verify R-TECH-07 (4xx broken page discovered by crawler) and R-TECH-11 (broken internal link) are present
    const ruleIds = auditPayload.data.findings.map((f: { ruleId: string }) => f.ruleId);
    expect(ruleIds).toContain('R-TECH-07');
    expect(ruleIds).toContain('R-TECH-11');

    // 6. Generate standalone HTML5 report (--format html)
    const htmlReportRes = await executeCli([
      'report',
      '--cwd',
      tempRoot,
      '--format',
      'html',
      '--lang',
      'fr',
      '--json',
    ]);
    expect(htmlReportRes.exitCode).toBe(0);
    const htmlReportPayload = JSON.parse(htmlReportRes.stdout);
    expect(htmlReportPayload.success).toBe(true);
    expect(htmlReportPayload.data.format).toBe('html');
    expect(fs.existsSync(htmlReportPayload.data.filePath)).toBe(true);

    const htmlContent = fs.readFileSync(htmlReportPayload.data.filePath, 'utf-8');
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('1. Résumé décisionnel');
    expect(htmlContent).toContain('Session de Crawl HTTP associée');
    expect(htmlContent).not.toContain('backdrop-filter');
    expect(htmlContent).not.toMatch(/<link[^>]+href=["']https?:\/\//i);
    expect(htmlContent).not.toMatch(/<script[^>]+src=["']https?:\/\//i);

    // 7. Generate JSON report (--format json)
    const jsonReportRes = await executeCli([
      'report',
      '--cwd',
      tempRoot,
      '--format',
      'json',
      '--lang',
      'fr',
      '--json',
    ]);
    expect(jsonReportRes.exitCode).toBe(0);
    const jsonReportPayload = JSON.parse(jsonReportRes.stdout);
    expect(jsonReportPayload.success).toBe(true);
    expect(jsonReportPayload.data.format).toBe('json');
    expect(fs.existsSync(jsonReportPayload.data.filePath)).toBe(true);

    const exportedJson = JSON.parse(fs.readFileSync(jsonReportPayload.data.filePath, 'utf-8'));
    expect(exportedJson.crawlRun).not.toBeNull();
    expect(exportedJson.crawlRun.id).toBe(crawlPayload.data.crawlRunId);
    expect(Array.isArray(exportedJson.findings)).toBe(true);
    expect(Array.isArray(exportedJson.actions)).toBe(true);
  });
});
