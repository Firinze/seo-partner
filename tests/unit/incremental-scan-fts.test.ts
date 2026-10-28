import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import type { ExtractedRouteData, FtsSearchResult } from '@seo-partner/core';
import { RouteRepository, SeoDatabase } from '@seo-partner/store';
import { runScanCommand } from 'seo-partner';

describe('Incremental Scan (< 5s), SQLite v1->v2 Migration & FTS5 Search (< 100ms)', () => {
  const tempDirs: string[] = [];

  function createTempProject(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-inc-scan-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('migrates SQLite schema from v1 to v2 and creates .seo/index.db.v1.bak', () => {
    const projectRoot = createTempProject();
    const seoDir = path.join(projectRoot, '.seo');
    fs.mkdirSync(seoDir, { recursive: true });
    const dbPath = path.join(seoDir, 'index.db');

    // Create a v1 database manually
    const v1Db = new DatabaseSync(dbPath);
    v1Db.exec(`
      CREATE TABLE schema_migration (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO schema_migration (version, applied_at) VALUES (1, '2026-01-01T00:00:00.000Z');
      CREATE TABLE page_meta (
        route_id INTEGER PRIMARY KEY,
        title TEXT,
        title_line INTEGER
      );
    `);
    v1Db.close();

    // Open with SeoDatabase (v2)
    const store = SeoDatabase.open(projectRoot);
    try {
      expect(fs.existsSync(`${dbPath}.v1.bak`)).toBe(true);
      const versionRow = store.db
        .prepare('SELECT MAX(version) AS max_v FROM schema_migration')
        .get() as { max_v: number };
      expect(versionRow.max_v).toBe(2);

      const cols = store.db.prepare('PRAGMA table_info(page_meta);').all() as Array<{
        name: string;
      }>;
      const colNames = cols.map((c) => c.name);
      expect(colNames).toContain('html_lang');
      expect(colNames).toContain('html_lang_line');
    } finally {
      store.close();
    }
  });

  it('reuses unchanged files, parses only modified files, purges deleted routes and indexes FTS5 in < 100ms', async () => {
    const projectRoot = createTempProject();
    fs.writeFileSync(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({ name: 'inc-test', dependencies: { next: '15.0.0' } }),
      'utf-8',
    );
    fs.mkdirSync(path.join(projectRoot, 'public'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'public', 'robots.txt'), 'User-agent: *\nAllow: /\n');
    fs.writeFileSync(
      path.join(projectRoot, 'public', 'sitemap.xml'),
      '<urlset><url><loc>https://example.com/</loc></url></urlset>',
    );

    // Create 50 module files and 4 Next.js App Router pages
    const libDir = path.join(projectRoot, 'src', 'lib');
    fs.mkdirSync(libDir, { recursive: true });
    for (let i = 1; i <= 50; i += 1) {
      fs.writeFileSync(
        path.join(libDir, `helper-${i}.ts`),
        `export const VALUE_${i} = ${i};\n`,
        'utf-8',
      );
    }

    const appDir = path.join(projectRoot, 'app');
    const routesToCreate = [
      { dir: '', title: 'Accueil Architecture Cloud', h1: 'Solutions Cloud Souveraines' },
      { dir: 'pricing', title: 'Tarifs Transparents SaaS', h1: 'Grille Tarifaire Entreprise' },
      { dir: 'security', title: 'Securite Anti-SSRF Avancee', h1: 'Protection Zero Trust' },
      { dir: 'obsolete', title: 'Ancienne Page Obsolete', h1: 'Page A Supprimer' },
    ];

    for (const r of routesToCreate) {
      const targetDir = r.dir ? path.join(appDir, r.dir) : appDir;
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetDir, 'page.tsx'),
        `export const metadata = { title: '${r.title}', description: 'Description detaillee pour ${r.title}' };\nexport default function Page() { return <main><h1>${r.h1}</h1></main>; }\n`,
        'utf-8',
      );
    }

    // 1. Initial Cold Scan
    const firstScan = await runScanCommand({ projectRoot });
    expect(firstScan.incremental).toBe(false);
    expect(firstScan.routesDiscovered).toBe(4);
    expect(firstScan.filesReused).toBe(0);

    // 2. Modify 5 files (2 routes + 3 helper ts files) and delete 1 route ('obsolete')
    fs.rmSync(path.join(appDir, 'obsolete', 'page.tsx'));

    fs.writeFileSync(
      path.join(appDir, 'pricing', 'page.tsx'),
      `export const metadata = { title: 'Nouveaux Tarifs Cloud 2026', description: 'Offres mises a jour pour 2026' };\nexport default function Page() { return <main><h1>Grille Tarifaire 2026</h1></main>; }\n`,
      'utf-8',
    );
    fs.writeFileSync(
      path.join(appDir, 'security', 'page.tsx'),
      `export const metadata = { title: 'Audit Securite et Conformite ISO', description: 'Securite renforcee' };\nexport default function Page() { return <main><h1>Conformite ISO 27001</h1></main>; }\n`,
      'utf-8',
    );
    for (let i = 1; i <= 3; i += 1) {
      fs.writeFileSync(
        path.join(libDir, `helper-${i}.ts`),
        `export const VALUE_${i} = ${i * 100};\n`,
        'utf-8',
      );
    }

    const secondScan = await runScanCommand({ projectRoot });
    expect(secondScan.incremental).toBe(true);
    expect(secondScan.filesParsed).toBe(5);
    expect(secondScan.filesPurged).toBe(1);
    expect(secondScan.filesReused).toBeGreaterThanOrEqual(50);
    expect(secondScan.routesDiscovered).toBe(3);
    expect(secondScan.durationMs).toBeLessThan(5000);

    // 3. Verify database routes and FTS5 search (< 100ms)
    const store = SeoDatabase.open(projectRoot);
    try {
      const routeRepo = new RouteRepository(store);
      const extracted: ReadonlyArray<ExtractedRouteData> = routeRepo.loadExtractedRoutes(
        secondScan.projectId,
      );
      const patterns = extracted.map((e: ExtractedRouteData) => e.route.pattern);
      expect(patterns).toContain('/');
      expect(patterns).toContain('/pricing');
      expect(patterns).toContain('/security');
      expect(patterns).not.toContain('/obsolete');

      const pricingRoute = extracted.find(
        (e: ExtractedRouteData) => e.route.pattern === '/pricing',
      );
      expect(pricingRoute?.title?.value).toBe('Nouveaux Tarifs Cloud 2026');

      const ftsStart = performance.now();
      const ftsHits: ReadonlyArray<FtsSearchResult> = routeRepo.searchFts(
        secondScan.projectId,
        'Tarifaire 2026',
      );
      const ftsElapsed = performance.now() - ftsStart;
      expect(ftsElapsed).toBeLessThan(100);
      expect(ftsHits.length).toBeGreaterThanOrEqual(1);
      expect(ftsHits[0]?.routePattern).toBe('/pricing');
    } finally {
      store.close();
    }
  });
});

