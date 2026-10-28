import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ExtractedRouteData, Finding } from '@seo-partner/core';
import { RouteRepository, SeoDatabase } from '@seo-partner/store';
import { runAuditCommand, runScanCommand } from 'seo-partner';

describe('PhpAdapter Conformance (Laravel/Blade, Symfony/Twig, Native PHP/Laragon — F-S5 Zero Execution)', () => {
  const tempDirs: string[] = [];

  function cloneFixtureToTemp(fixtureRelPath: string): string {
    const src = path.resolve(fixtureRelPath);
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-php-fixture-'));
    tempDirs.push(dest);
    fs.cpSync(src, dest, { recursive: true });
    return dest;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects Laravel (routes/web.php + Blade @extends/@section), extracts routes, and flags seeded SEO issues', async () => {
    const laravelDir = cloneFixtureToTemp('tests/fixtures/laravel-sample');
    const scanRes = await runScanCommand({ projectRoot: laravelDir });

    expect(scanRes.frameworks).toContain('php');
    expect(scanRes.routesDiscovered).toBe(3);

    const store = SeoDatabase.open(laravelDir);
    try {
      const routes: ReadonlyArray<ExtractedRouteData> = new RouteRepository(
        store,
      ).loadExtractedRoutes(scanRes.projectId);
      const patterns = routes.map((r: ExtractedRouteData) => r.route.pattern);
      expect(patterns).toEqual(['/', '/contact', '/services']);

      const welcomeRoute = routes.find((r: ExtractedRouteData) => r.route.pattern === '/');
      expect(welcomeRoute?.route.routerKind).toBe('laravel');
      expect(welcomeRoute?.title?.value).toBe(
        'Expert SEO Laravel et Architecture Web Moderne',
      );
      expect(welcomeRoute?.htmlLang?.value).toBe('fr'); // Inherited from resources/views/layouts/app.blade.php
    } finally {
      store.close();
    }

    const auditRes = await runAuditCommand({ projectRoot: laravelDir });
    const ruleIds = new Set(auditRes.findings.map((f: Finding) => f.ruleId));

    expect(ruleIds.has('R-ONPAGE-09')).toBe(true); // H1 -> H3 jump in services.blade.php
    expect(ruleIds.has('R-ONPAGE-08')).toBe(true); // missing alt in services.blade.php
    expect(ruleIds.has('R-ONPAGE-11')).toBe(true); // missing width/height in services.blade.php
    expect(ruleIds.has('R-ONPAGE-12')).toBe(true); // generic anchor "cliquez ici" in services.blade.php
    expect(ruleIds.has('R-LOCAL-01')).toBe(true); // LocalBusiness missing address in contact.blade.php
    expect(ruleIds.has('R-LOCAL-03')).toBe(true); // LocalBusiness telephone not E.164 in contact.blade.php
  });

  it('detects Symfony (#[Route] attributes + config/routes.yaml + Twig {% extends %}/{% block %})', async () => {
    const symfonyDir = cloneFixtureToTemp('tests/fixtures/symfony-sample');
    const scanRes = await runScanCommand({ projectRoot: symfonyDir });

    expect(scanRes.frameworks).toContain('php');
    expect(scanRes.routesDiscovered).toBe(3);

    const store = SeoDatabase.open(symfonyDir);
    try {
      const routes: ReadonlyArray<ExtractedRouteData> = new RouteRepository(
        store,
      ).loadExtractedRoutes(scanRes.projectId);
      const patterns = routes.map((r: ExtractedRouteData) => r.route.pattern);
      expect(patterns).toEqual(['/', '/blog', '/tarifs']);

      const homeRoute = routes.find((r: ExtractedRouteData) => r.route.pattern === '/');
      expect(homeRoute?.route.routerKind).toBe('symfony');
      expect(homeRoute?.title?.value).toBe(
        'Plateforme Symfony Entreprise et Audit SEO',
      );
      expect(homeRoute?.htmlLang?.value).toBe('fr'); // Inherited from templates/base.html.twig
    } finally {
      store.close();
    }

    const auditRes = await runAuditCommand({ projectRoot: symfonyDir });
    const ruleIds = new Set(auditRes.findings.map((f: Finding) => f.ruleId));
    expect(ruleIds.has('R-SCHEMA-03')).toBe(true); // Article missing datePublished & author in blog/index.html.twig
  });

  it('detects Native PHP / Laragon projects, resolves require_once header.php, and flags anomalies', async () => {
    const phpDir = cloneFixtureToTemp('tests/fixtures/php-laragon-sample');
    const scanRes = await runScanCommand({ projectRoot: phpDir });

    expect(scanRes.frameworks).toContain('php');
    expect(scanRes.routesDiscovered).toBe(2);

    const store = SeoDatabase.open(phpDir);
    try {
      const routes: ReadonlyArray<ExtractedRouteData> = new RouteRepository(
        store,
      ).loadExtractedRoutes(scanRes.projectId);
      const indexRoute = routes.find((r: ExtractedRouteData) => r.route.pattern === '/');
      expect(indexRoute?.route.routerKind).toBe('php');
      expect(indexRoute?.title?.value).toBe('Site Vitrine PHP Natif sous Laragon'); // Inherited from includes/header.php
      expect(indexRoute?.htmlLang?.value).toBe('fr');
    } finally {
      store.close();
    }

    const auditRes = await runAuditCommand({ projectRoot: phpDir });
    const ruleIds = new Set(auditRes.findings.map((f: Finding) => f.ruleId));
    expect(ruleIds.has('R-TECH-14')).toBe(true); // <html> without lang on public/a-propos.php
    expect(ruleIds.has('R-ONPAGE-01')).toBe(true); // missing <title> on public/a-propos.php
  });
});

