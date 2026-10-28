import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Finding, RuleDefinition } from '@seo-partner/core';
import { ALL_V01_RULES, runRulesEngine } from '@seo-partner/rules';
import { runAuditCommand } from 'seo-partner';

const tempDirs: string[] = [];

function cloneFixtureToTemp(fixtureRelPath: string): string {
  const src = path.resolve(fixtureRelPath);
  const seoLeftover = path.join(src, '.seo');
  if (fs.existsSync(seoLeftover)) {
    fs.rmSync(seoLeftover, { recursive: true, force: true });
  }
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-rules-fixture-'));
  tempDirs.push(dest);
  fs.cpSync(src, dest, { recursive: true });
  return dest;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d && fs.existsSync(d)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  }
});

describe('US3 & SC-004: 15 Must SEO Rules Catalog & Mandatory Evidence', () => {
  it('registers all 15 Must rules (R-TECH-01..06, R-ONPAGE-01..08, R-SCHEMA-01)', () => {
    expect(ALL_V01_RULES).toHaveLength(15);
    const ids = ALL_V01_RULES.map((r: RuleDefinition) => r.id);
    expect(ids).toEqual([
      'R-TECH-01',
      'R-TECH-02',
      'R-TECH-03',
      'R-TECH-04',
      'R-TECH-05',
      'R-TECH-06',
      'R-ONPAGE-01',
      'R-ONPAGE-02',
      'R-ONPAGE-03',
      'R-ONPAGE-04',
      'R-ONPAGE-05',
      'R-ONPAGE-06',
      'R-ONPAGE-07',
      'R-ONPAGE-08',
      'R-SCHEMA-01',
    ]);
  });

  it('produces 0 findings on a fully compliant route and project', () => {
    const findings = runRulesEngine({
      project: {
        id: 'proj_clean',
        rootPath: '/tmp/clean',
        name: 'clean-site',
        frameworks: ['nextjs'],
        hasRobotsTxt: true,
        hasSitemap: true,
        createdAt: '2026-10-28T00:00:00Z',
        lastScannedAt: '2026-10-28T00:00:00Z',
      },
      sitemapFilePath: 'public/sitemap.xml',
      routes: [
        {
          route: {
            pattern: '/',
            filePath: 'src/app/page.tsx',
            routerKind: 'nextjs-app',
            renderingMode: 'ssr-ssg',
            isPrivate: false,
            inSitemap: true,
          },
          title: {
            value: 'Agences SEO Local & Technique | Plateforme Example Pro',
            line: 4,
          },
          description: {
            value:
              'Optimisez votre visibilite organique, votre fiche Google Business Profile et vos performances techniques avec des audits deterministes verifies sur mesure.',
            line: 5,
          },
          canonical: { value: 'https://example.com/', line: 7 },
          robots: { value: 'index, follow', line: 8 },
          headings: [{ level: 1, text: 'Plateforme SEO', line: 20 }],
          openGraph: {},
          hreflang: [],
          images: [
            {
              src: '/hero.webp',
              alt: 'Hero dashboard',
              hasAlt: true,
              width: 800,
              height: 450,
              line: 22,
            },
          ],
          links: [],
          jsonLdItems: [
            {
              schemaType: 'Organization',
              rawJson: '{"@context":"https://schema.org","@type":"Organization"}',
              isValid: true,
              validationError: null,
              line: 25,
            },
          ],
        },
      ],
    });

    expect(findings).toHaveLength(0);
  });

  it('detects all seeded anomalies in nextjs-app-sample and nextjs-pages-sample with file + line >= 1 evidence', async () => {
    const appFixture = cloneFixtureToTemp('tests/fixtures/nextjs-app-sample');
    const appAudit = await runAuditCommand({ projectRoot: appFixture });

    expect(appAudit.totalFindings).toBeGreaterThan(0);
    expect(appAudit.blockingIndexingCount).toBeGreaterThanOrEqual(2);

    const detectedRuleIds = new Set(appAudit.findings.map((f: Finding) => f.ruleId));
    expect(detectedRuleIds.has('R-TECH-03')).toBe(true); // noindex on /pricing
    expect(detectedRuleIds.has('R-TECH-04')).toBe(true); // /dashboard in sitemap
    expect(detectedRuleIds.has('R-TECH-05')).toBe(true); // missing canonical on /pricing & /about
    expect(detectedRuleIds.has('R-TECH-06')).toBe(true); // client-only /about without metadata
    expect(detectedRuleIds.has('R-ONPAGE-01')).toBe(true); // missing title on /about
    expect(detectedRuleIds.has('R-ONPAGE-03')).toBe(true); // short title on /pricing
    expect(detectedRuleIds.has('R-ONPAGE-04')).toBe(true); // missing description on /about
    expect(detectedRuleIds.has('R-ONPAGE-06')).toBe(true); // short description on /pricing
    expect(detectedRuleIds.has('R-ONPAGE-07')).toBe(true); // 2 H1s on /pricing & 0 H1 on /about
    expect(detectedRuleIds.has('R-ONPAGE-08')).toBe(true); // missing alt on /pricing
    expect(detectedRuleIds.has('R-SCHEMA-01')).toBe(true); // broken JSON-LD on /pricing

    for (const f of appAudit.findings) {
      expect(f.evidence.filePath.length).toBeGreaterThan(0);
      expect(f.evidence.lineNumber).toBeGreaterThanOrEqual(1);
      expect(f.officialSourceUrl).toMatch(/^https:\/\//);
    }

    const pagesFixture = cloneFixtureToTemp('tests/fixtures/nextjs-pages-sample');
    const pagesAudit = await runAuditCommand({ projectRoot: pagesFixture });
    const pagesRuleIds = new Set(pagesAudit.findings.map((f: Finding) => f.ruleId));
    expect(pagesRuleIds.has('R-TECH-01')).toBe(true); // missing robots.txt
    expect(pagesRuleIds.has('R-TECH-02')).toBe(true); // missing sitemap.xml
  });
});

