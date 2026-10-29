import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SeoDatabase, WatchRepository } from '@seo-partner/store';
import { runWatchSync, checkWatchFreshness } from '@seo-partner/tools';
import { runDoctorCommand } from '../../packages/cli/src/commands/doctor.js';

describe('Google Watch Synchronization & Freshness Check (Integration)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-watch-test-'));
    fs.mkdirSync(path.join(tmpDir, '.seo'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.seo', 'config.json'),
      JSON.stringify({
        version: '1.0',
        projectName: 'watch-test',
        lang: 'fr',
        ideTargets: [],
        maxFileSizeKb: 500,
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(tmpDir, '.gitignore'),
      '.agents/\n.seo/index.db*\nnode_modules/\n',
      'utf-8',
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should synchronize official feeds in offline mode and populate SQLite', async () => {
    const result = await runWatchSync({
      projectRoot: tmpDir,
      offline: true,
      force: true,
    });

    expect(result.sourcesChecked).toBe(2);
    expect(result.entries.length).toBeGreaterThan(0);

    const store = SeoDatabase.open(tmpDir);
    const watchRepo = new WatchRepository(store);
    const sources = watchRepo.listSources();
    expect(sources.length).toBe(2);

    const entries = watchRepo.listEntries();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.officialUrl).toBeTruthy();
    expect(entries[0]?.confirmed).toBe(true);

    const isFresh = watchRepo.isFresh(90);
    expect(isFresh).toBe(true);
    store.close();

    const refFile = path.join(tmpDir, 'skills', 'seo-partner', 'references', 'veille-mises-a-jour.md');
    expect(fs.existsSync(refFile)).toBe(true);
    const markdown = fs.readFileSync(refFile, 'utf-8');
    expect(markdown).toContain('Veille Officielle');
    expect(markdown).toContain('Confirmé officiel');
  });

  it('should raise a doctor warning if the watch is older than 90 days', async () => {
    const store = SeoDatabase.open(tmpDir);
    const watchRepo = new WatchRepository(store);

    // Seed with an old source (> 90 days ago)
    const oldDate = new Date(Date.now() - 95 * 24 * 3600 * 1000).toISOString();
    watchRepo.upsertSource({
      id: 'google-search-central-blog',
      url: 'https://developers.google.com/search/blog/feeds/posts/default',
      kind: 'blog',
      lastCheckedAt: oldDate,
      contentHash: 'mock-old-hash',
    });
    store.close();

    const freshness = checkWatchFreshness(tmpDir, 90);
    expect(freshness.status).toBe('warn');
    expect(freshness.diffDays).toBeGreaterThan(90);

    const doctorResult = runDoctorCommand({ projectRoot: tmpDir });
    const watchCheck = doctorResult.checks.find((c) => c.id === 'watch-freshness');
    expect(watchCheck).toBeDefined();
    expect(watchCheck?.status).toBe('warn');
    expect(watchCheck?.message).toContain('90 jours');
  });
});
