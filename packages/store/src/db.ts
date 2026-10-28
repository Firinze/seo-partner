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
    this.db.exec(INITIAL_SCHEMA_SQL);
    const row = this.db
      .prepare('SELECT MAX(version) AS max_v FROM schema_migration')
      .get() as { max_v: number | null } | undefined;
    const currentVersion = row?.max_v ?? 0;

    if (currentVersion < SCHEMA_VERSION) {
      if (currentVersion > 0 && fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, `${this.dbPath}.bak-v${currentVersion}`);
      }
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

