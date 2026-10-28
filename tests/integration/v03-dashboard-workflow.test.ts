import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CliEnvelope, ServeCommandResult } from '@seo-partner/core';
import { DashboardApiClient } from '@seo-partner/dashboard';
import { executeCli, runServeCommand } from 'seo-partner';

describe('E2E Workflow v0.3 — seo-partner serve, Port Fallback, OpenAPI 3.1 & Dashboard Client', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-v03-e2e-'));
    fs.mkdirSync(path.join(tmpDir, 'app', 'blog'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'v03-e2e-project', dependencies: { next: '15.1.0' } }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(tmpDir, 'app', 'page.tsx'),
      `
export const metadata = {
  title: 'Plateforme SEO Locale Deterministe — Accueil Officiel',
  description: 'Audit SEO local-first avec SQLite WAL, FTS5, OpenAPI 3.1 et Dashboard WCAG 2.2 AA.',
  alternates: { canonical: 'https://seo-partner.example.com/' },
};
export default function Home() {
  return <main><h1>Plateforme SEO Locale Deterministe</h1><a href="/blog">Blog</a></main>;
}
      `.trim(),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(tmpDir, 'app', 'blog', 'page.tsx'),
      `
export default function BlogPage() {
  return <main><h1>Articles Techniques SEO</h1></main>;
}
      `.trim(),
      'utf-8',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('executes complete v0.3 workflow: CLI serve with port auto-fallback, DashboardApiClient, FTS5, decisions, and reports', async () => {
    // 1. Hold an ephemeral loopback port with first server
    const firstExec = await runServeCommand({
      projectRoot: tmpDir,
      port: 0,
      lang: 'fr',
    });
    const busyPort = firstExec.result.port;

    // 2. Launch second server requesting busyPort -> verify automatic fallback to busyPort + 1
    const secondExec = await runServeCommand({
      projectRoot: tmpDir,
      port: busyPort,
      lang: 'fr',
    });

    try {
      expect(secondExec.result.host).toBe('127.0.0.1');
      expect(secondExec.result.requestedPort).toBe(busyPort);
      expect(secondExec.result.port).not.toBe(busyPort);
      expect(secondExec.result.port).toBeGreaterThan(0);
      expect(secondExec.result.fallbackUsed).toBe(true);
      expect(secondExec.result.openApiUrl).toBe(
        `http://127.0.0.1:${secondExec.result.port}/api/v1/openapi.json`,
      );

      // 3. Connect DashboardApiClient to the running server app with automatic session cookie forwarding
      let sessionCookie = '';
      const client = new DashboardApiClient({
        baseUrl: secondExec.result.url,
        fetcher: async (input, init) => {
          const headers = new Headers(init?.headers);
          if (sessionCookie) {
            headers.set('Cookie', sessionCookie);
          }
          const res = await secondExec.server.app.request(String(input), {
            ...init,
            headers,
          });
          const setCookie = res.headers.get('set-cookie');
          if (setCookie) {
            sessionCookie = setCookie.split(';')[0] ?? '';
          }
          return res;
        },
      });

      const sessionRes = await client.initSession();
      expect(sessionRes.success).toBe(true);
      expect(sessionCookie).toContain('seo_partner_session=');

      const overviewRes = await client.getOverview();
      expect(overviewRes.success).toBe(true);
      expect(overviewRes.data.stats.routesCount).toBe(2);
      expect(overviewRes.data.stats.totalFindings).toBeGreaterThan(0);

      const ftsRes = await client.searchFts('Deterministe');
      expect(ftsRes.success).toBe(true);
      expect(ftsRes.data.durationMs).toBeLessThan(100);
      expect(ftsRes.data.results.length).toBeGreaterThanOrEqual(1);

      const decisionRes = await client.createDecision({
        title: 'Valider le Dashboard local v0.3',
        rationale: 'Conformite OpenAPI 3.1, RFC 9457 et WCAG 2.2 AA verifiee.',
      });
      expect(decisionRes.success).toBe(true);
      expect(
        fs.readFileSync(path.join(tmpDir, '.seo', 'decisions.md'), 'utf-8'),
      ).toContain('Valider le Dashboard local v0.3');

      const reportRes = await client.exportReport({
        format: 'md',
        reportType: 'audit-complet',
        lang: 'fr',
      });
      expect(reportRes.success).toBe(true);
      expect(fs.existsSync(reportRes.data.filePath)).toBe(true);
    } finally {
      await secondExec.server.close();
      await firstExec.server.close();
    }

    // 4. Verify CLI `seo-partner serve --dry-run --json` envelope
    const cliRes = await executeCli([
      'serve',
      '--cwd',
      tmpDir,
      '--port',
      '0',
      '--lang',
      'fr',
      '--dry-run',
      '--json',
    ]);
    expect(cliRes.exitCode).toBe(0);
    const parsed = JSON.parse(cliRes.stdout) as CliEnvelope<ServeCommandResult>;
    expect(parsed.success).toBe(true);
    expect(parsed.data?.host).toBe('127.0.0.1');
    expect(parsed.data?.port).toBeGreaterThan(0);
  });
});
