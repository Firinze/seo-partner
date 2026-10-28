import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { getSeoDbPath } from '@seo-partner/core';
import { INITIAL_SCHEMA_SQL, SCHEMA_VERSION } from './schema.js';

export class SeoDatabase {
  public readonly db: DatabaseSync;
  public readonly dbPath: string;

  private constructor(db: DatabaseSync, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  public static open(projectRoot: string, options?: { rebuild?: boolean }): SeoDatabase {
    const dbPath = getSeoDbPath(projectRoot);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    if (options?.rebuild && fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
      fs.rmSync(`${dbPath}-wal`, { force: true });
      fs.rmSync(`${dbPath}-shm`, { force: true });
    }

    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    const instance = new SeoDatabase(db, dbPath);
    instance.migrate();
    return instance;
  }

  public migrate(): void {
    // Check if schema_migration already exists before running INITIAL_SCHEMA_SQL
    const hasMigrationTable = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migration'",
      )
      .get() as { name?: string } | undefined;

    let currentVersion = 0;
    if (hasMigrationTable?.name) {
      const row = this.db
        .prepare('SELECT MAX(version) AS max_v FROM schema_migration')
        .get() as { max_v: number | null } | undefined;
      currentVersion = row?.max_v ?? 0;
    }

    if (currentVersion > 0 && currentVersion < SCHEMA_VERSION && fs.existsSync(this.dbPath)) {
      // Checkpoint WAL so the backup file contains all committed pages
      try {
        this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      } catch {
        // Ignore if checkpoint not needed
      }
      fs.copyFileSync(this.dbPath, `${this.dbPath}.v${currentVersion}.bak`);
    }

    this.db.exec(INITIAL_SCHEMA_SQL);

    // Ensure v1 -> v2 columns on page_meta exist when upgrading from v1
    if (currentVersion === 1) {
      const cols = this.db.prepare('PRAGMA table_info(page_meta);').all() as Array<{
        name: string;
      }>;
      const colNames = new Set(cols.map((c) => c.name));
      if (!colNames.has('html_lang')) {
        this.db.exec('ALTER TABLE page_meta ADD COLUMN html_lang TEXT;');
      }
      if (!colNames.has('html_lang_line')) {
        this.db.exec('ALTER TABLE page_meta ADD COLUMN html_lang_line INTEGER;');
      }
    }

    // Ensure v2 -> v3 columns on route and page_meta exist when upgrading
    if (currentVersion > 0 && currentVersion < 3) {
      const routeCols = this.db.prepare('PRAGMA table_info(route);').all() as Array<{
        name: string;
      }>;
      const routeColNames = new Set(routeCols.map((c) => c.name));
      if (!routeColNames.has('is_dynamic')) {
        this.db.exec('ALTER TABLE route ADD COLUMN is_dynamic INTEGER NOT NULL DEFAULT 0;');
      }

      const metaCols = this.db.prepare('PRAGMA table_info(page_meta);').all() as Array<{
        name: string;
      }>;
      const metaColNames = new Set(metaCols.map((c) => c.name));
      if (!metaColNames.has('is_dynamic')) {
        this.db.exec('ALTER TABLE page_meta ADD COLUMN is_dynamic INTEGER NOT NULL DEFAULT 0;');
      }
    }

    if (currentVersion < SCHEMA_VERSION) {
      this.db
        .prepare('INSERT OR REPLACE INTO schema_migration (version, applied_at) VALUES (?, ?)')
        .run(SCHEMA_VERSION, new Date().toISOString());
    }
  }

  public runInTransaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  public getJournalMode(): string {
    const row = this.db.prepare('PRAGMA journal_mode;').get() as { journal_mode?: string } | undefined;
    return (row?.journal_mode ?? 'unknown').toLowerCase();
  }

  public close(): void {
    this.db.close();
  }
}
