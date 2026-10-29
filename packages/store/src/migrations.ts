import type { DatabaseSync } from 'node:sqlite';
import { SCHEMA_VERSION } from './schema.js';

export interface SchemaIntegrityReport {
  readonly valid: boolean;
  readonly currentVersion: number;
  readonly expectedVersion: number;
  readonly missingTables: ReadonlyArray<string>;
  readonly foreignKeysEnabled: boolean;
  readonly integrityCheck: string;
}

export const REQUIRED_V5_TABLES = [
  'schema_migration',
  'project',
  'file',
  'route',
  'page_meta',
  'link',
  'schema_item',
  'crawl_run',
  'crawl_page',
  'rule',
  'finding',
  'action',
  'decision',
  'gsc_performance',
  'gsc_inspection',
  'cwv_metrics',
  'agent_run_session',
  'agent_step_log',
  'watch_source',
  'watch_entry',
  'bing_performance',
  'bing_inspection',
] as const;

export function verifySchemaIntegrity(db: DatabaseSync): SchemaIntegrityReport {
  // Check foreign keys
  const fkRow = db.prepare('PRAGMA foreign_keys;').get() as { foreign_keys?: number } | undefined;
  const foreignKeysEnabled = (fkRow?.foreign_keys ?? 0) === 1;

  // Check version
  let currentVersion = 0;
  const hasMigrationTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migration'")
    .get() as { name?: string } | undefined;

  if (hasMigrationTable?.name) {
    const row = db
      .prepare('SELECT MAX(version) AS max_v FROM schema_migration')
      .get() as { max_v: number | null } | undefined;
    currentVersion = row?.max_v ?? 0;
  }

  // Check table presence
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')")
    .all() as Array<{ name: string }>;
  const existingTableNames = new Set(tables.map((t) => t.name));

  const missingTables = REQUIRED_V5_TABLES.filter((t) => !existingTableNames.has(t));

  // Run integrity check
  const integrityRow = db.prepare('PRAGMA integrity_check;').get() as { integrity_check?: string } | undefined;
  const integrityCheck = integrityRow?.integrity_check ?? 'unknown';

  const valid =
    currentVersion === SCHEMA_VERSION &&
    missingTables.length === 0 &&
    integrityCheck === 'ok';

  return {
    valid,
    currentVersion,
    expectedVersion: SCHEMA_VERSION,
    missingTables,
    foreignKeysEnabled,
    integrityCheck,
  };
}
