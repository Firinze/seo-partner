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

    // Ensure v3 -> v4 tables exist when upgrading
    if (currentVersion > 0 && currentVersion < 4) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS gsc_performance (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          query TEXT NOT NULL DEFAULT '',
          device TEXT NOT NULL DEFAULT 'all',
          country TEXT NOT NULL DEFAULT 'all',
          clicks INTEGER NOT NULL DEFAULT 0,
          impressions INTEGER NOT NULL DEFAULT 0,
          ctr REAL NOT NULL DEFAULT 0.0,
          position REAL NOT NULL DEFAULT 0.0,
          date_start TEXT NOT NULL,
          date_end TEXT NOT NULL,
          fetched_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS gsc_inspection (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          verdict TEXT NOT NULL,
          coverage_state TEXT NOT NULL,
          indexing_state TEXT NOT NULL,
          robots_txt_state TEXT NOT NULL,
          last_crawl_time TEXT,
          page_fetch_state TEXT,
          canonical_user TEXT,
          canonical_google TEXT,
          fetched_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cwv_metrics (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          form_factor TEXT NOT NULL DEFAULT 'PHONE',
          scope TEXT NOT NULL DEFAULT 'url',
          lcp_ms INTEGER,
          lcp_rating TEXT,
          inp_ms INTEGER,
          inp_rating TEXT,
          cls_score REAL,
          cls_rating TEXT,
          fcp_ms INTEGER,
          fcp_rating TEXT,
          ttfb_ms INTEGER,
          ttfb_rating TEXT,
          fetched_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agent_run_session (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
          goal TEXT NOT NULL,
          model_name TEXT NOT NULL,
          provider TEXT NOT NULL,
          max_iterations INTEGER NOT NULL DEFAULT 10,
          iterations_completed INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'running',
          started_at TEXT NOT NULL,
          completed_at TEXT,
          patches_generated INTEGER NOT NULL DEFAULT 0,
          patches_applied INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS agent_step_log (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES agent_run_session(id) ON DELETE CASCADE,
          step_index INTEGER NOT NULL,
          thought TEXT,
          tool_name TEXT NOT NULL,
          tool_arguments TEXT NOT NULL,
          tool_result TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_gsc_perf_proj_url ON gsc_performance (project_id, url);
        CREATE INDEX IF NOT EXISTS idx_gsc_perf_query ON gsc_performance (project_id, query);
        CREATE INDEX IF NOT EXISTS idx_gsc_insp_proj_url ON gsc_inspection (project_id, url);
        CREATE INDEX IF NOT EXISTS idx_cwv_proj_url ON cwv_metrics (project_id, url, form_factor);
        CREATE INDEX IF NOT EXISTS idx_agent_session_proj ON agent_run_session (project_id, started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_agent_step_session ON agent_step_log (session_id, step_index ASC);
      `);
    }

    // Ensure v4 -> v5 tables exist when upgrading
    if (currentVersion > 0 && currentVersion < 5) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS watch_source (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL UNIQUE,
          kind TEXT NOT NULL,
          last_checked_at TEXT,
          content_hash TEXT
        );

        CREATE TABLE IF NOT EXISTS watch_entry (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL REFERENCES watch_source(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          pub_date TEXT NOT NULL,
          official_url TEXT NOT NULL,
          confirmed INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bing_performance (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          query TEXT NOT NULL DEFAULT '',
          clicks INTEGER NOT NULL DEFAULT 0,
          impressions INTEGER NOT NULL DEFAULT 0,
          ctr REAL NOT NULL DEFAULT 0.0,
          position REAL NOT NULL DEFAULT 0.0,
          date_start TEXT NOT NULL,
          date_end TEXT NOT NULL,
          fetched_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bing_inspection (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          verdict TEXT NOT NULL,
          indexing_state TEXT NOT NULL,
          crawl_state TEXT NOT NULL,
          last_crawl_time TEXT,
          http_code INTEGER NOT NULL DEFAULT 0,
          fetched_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_watch_entry_source ON watch_entry(source_id, pub_date DESC);
        CREATE INDEX IF NOT EXISTS idx_watch_entry_confirmed ON watch_entry(confirmed);
        CREATE INDEX IF NOT EXISTS idx_bing_perf_project_url ON bing_performance(project_id, url);
        CREATE INDEX IF NOT EXISTS idx_bing_perf_query ON bing_performance(project_id, query);
        CREATE INDEX IF NOT EXISTS idx_bing_insp_project_url ON bing_inspection(project_id, url);
      `);
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
