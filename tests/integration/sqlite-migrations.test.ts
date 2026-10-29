import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SeoDatabase, verifySchemaIntegrity } from '@seo-partner/store';

describe('US3: SQLite Schema v5 Backward-Compatible Migrations', () => {
  let projectRoot = '';

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-sqlite-mig-'));
  });

  afterEach(() => {
    if (projectRoot && fs.existsSync(projectRoot)) {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('initializes a fresh database directly to schema v5 with all 19 tables and valid foreign keys', () => {
    const store = SeoDatabase.open(projectRoot);
    try {
      const integrity = verifySchemaIntegrity(store.db);
      expect(integrity.valid).toBe(true);
      expect(integrity.currentVersion).toBe(5);
      expect(integrity.missingTables).toHaveLength(0);
      expect(integrity.foreignKeysEnabled).toBe(true);
      expect(integrity.integrityCheck).toBe('ok');
    } finally {
      store.close();
    }
  });

  it('safely upgrades a simulated v3 database to v5 preserving existing data and creating backup', () => {
    const seoDir = path.join(projectRoot, '.seo');
    fs.mkdirSync(seoDir, { recursive: true });
    const dbPath = path.join(seoDir, 'index.db');

    // Manually create a minimal v3 schema
    const rawDb = new DatabaseSync(dbPath);
    rawDb.exec(`
      CREATE TABLE schema_migration (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO schema_migration (version, applied_at) VALUES (1, '2026-01-01'), (2, '2026-02-01'), (3, '2026-03-01');
      CREATE TABLE project (id TEXT PRIMARY KEY, root_path TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);
      INSERT INTO project (id, root_path, name, created_at) VALUES ('proj_v3', '${projectRoot.replace(/\\/g, '/')}', 'Legacy V3 App', '2026-03-01');
    `);
    rawDb.close();

    // Now open with SeoDatabase which automatically migrates
    const store = SeoDatabase.open(projectRoot);
    try {
      const integrity = verifySchemaIntegrity(store.db);
      expect(integrity.valid).toBe(true);
      expect(integrity.currentVersion).toBe(5);

      // Verify legacy project data was preserved
      const projRow = store.db.prepare("SELECT name FROM project WHERE id = 'proj_v3'").get() as any;
      expect(projRow?.name).toBe('Legacy V3 App');

      // Verify v3 backup was created
      expect(fs.existsSync(`${dbPath}.v3.bak`)).toBe(true);
    } finally {
      store.close();
    }
  });
});
