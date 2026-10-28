import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { escapeHtml, generateHtmlReportContent } from '@seo-partner/rules';
import { runReportCommand } from 'seo-partner';

describe('Standalone HTML5 Report Generator (Zero External Deps, Zero Glassmorphism, Zero Emoji)', () => {
  const tempDirs: string[] = [];

  function cloneFixtureToTemp(fixtureRelPath: string): string {
    const src = path.resolve(fixtureRelPath);
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-html-report-'));
    tempDirs.push(dest);
    fs.cpSync(src, dest, { recursive: true });
    return dest;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('generates a 100% self-contained offline HTML5 report with 5 sections, zero glassmorphism, and zero emojis', async () => {
    const laravelDir = cloneFixtureToTemp('tests/fixtures/laravel-sample');

    const resFr = await runReportCommand({
      projectRoot: laravelDir,
      reportType: 'audit-complet',
      format: 'html',
      lang: 'fr',
    });

    expect(resFr.format).toBe('html');
    expect(resFr.filePath.endsWith('.html')).toBe(true);
    expect(fs.existsSync(resFr.filePath)).toBe(true);

    const html = fs.readFileSync(resFr.filePath, 'utf-8');

    // 1. Verify all 5 standardized sections in French
    expect(html).toContain('1. Résumé décisionnel');
    expect(html).toContain('2. Constats avec preuves');
    expect(html).toContain('3. Actions priorisées (Score ICE)');
    expect(html).toContain('4. Impact attendu');
    expect(html).toContain('5. Suivi');

    // 2. Verify zero external scripts, stylesheets, or images
    expect(html).not.toMatch(/<link\b[^>]*href=/i);
    expect(html).not.toMatch(/<script\b[^>]*src=/i);
    expect(html).not.toMatch(/<img\b[^>]*src=["']https?:/i);

    // 3. Verify zero glassmorphism or blur filters
    expect(html).not.toMatch(/backdrop-filter/i);
    expect(html).not.toMatch(/feGaussianBlur/i);

    // 4. Verify zero emojis (Extended_Pictographic Unicode property)
    expect(/\p{Extended_Pictographic}/u.test(html)).toBe(false);

    // 5. Verify JSON format option works as well
    const resJson = await runReportCommand({
      projectRoot: laravelDir,
      reportType: 'audit-complet',
      format: 'json',
      lang: 'en',
    });
    expect(resJson.format).toBe('json');
    expect(resJson.filePath.endsWith('.json')).toBe(true);
    const parsedJson = JSON.parse(fs.readFileSync(resJson.filePath, 'utf-8')) as {
      reportType: string;
      findings: unknown[];
    };
    expect(parsedJson.reportType).toBe('audit-complet');
    expect(Array.isArray(parsedJson.findings)).toBe(true);
  });

  it('escapes untrusted crawled content in HTML output to prevent XSS or prompt injection', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );

    const html = generateHtmlReportContent({
      projectRoot: '/tmp/test',
      project: {
        id: 'proj_xss',
        rootPath: '/tmp/test',
        name: 'xss-check <img onerror=alert(1)>',
        frameworks: ['laravel'],
        hasRobotsTxt: true,
        hasSitemap: true,
        createdAt: '2026-10-28T00:00:00Z',
        lastScannedAt: '2026-10-28T00:00:00Z',
      },
      findings: [],
      actions: [],
      lang: 'en',
      reportType: 'audit-complet',
      crawlRun: {
        id: 'crawl_xss',
        projectId: 'proj_xss',
        startUrl: 'http://127.0.0.1:8000',
        config: {
          maxPages: 10,
          maxDepth: 2,
          concurrency: 2,
          rateLimitMs: 100,
          maxRedirects: 5,
          allowLocal: true,
          js: false,
          userAgent: 'seo-partner-bot/0.2',
        },
        status: 'completed',
        pagesCrawled: 3,
        errorsCount: 0,
        startedAt: '2026-10-28T00:00:00Z',
        completedAt: '2026-10-28T00:00:02Z',
      },
    });

    expect(html).toContain('1. Executive Summary');
    expect(html).toContain('Associated HTTP Crawl Session');
    expect(html).toContain('&lt;img onerror=alert(1)&gt;');
    expect(html).not.toContain('<img onerror=alert(1)>');
  });
});

