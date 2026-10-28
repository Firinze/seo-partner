export const SCHEMA_VERSION = 1;

export const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_migration (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL,
  name TEXT NOT NULL,
  frameworks_json TEXT NOT NULL DEFAULT '[]',
  has_robots_txt INTEGER NOT NULL DEFAULT 0,
  has_sitemap INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_scanned_at TEXT
);

CREATE TABLE IF NOT EXISTS file (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  hash TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  kind TEXT NOT NULL,
  scanned_at TEXT NOT NULL,
  UNIQUE(project_id, path)
);

CREATE TABLE IF NOT EXISTS route (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  file_id INTEGER NOT NULL REFERENCES file(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  router_kind TEXT NOT NULL,
  rendering_mode TEXT NOT NULL,
  is_private INTEGER NOT NULL DEFAULT 0,
  in_sitemap INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS page_meta (
  route_id INTEGER PRIMARY KEY REFERENCES route(id) ON DELETE CASCADE,
  title TEXT,
  title_line INTEGER,
  description TEXT,
  description_line INTEGER,
  canonical TEXT,
  canonical_line INTEGER,
  robots TEXT,
  robots_line INTEGER,
  h1_count INTEGER NOT NULL DEFAULT 0,
  h1_first_text TEXT,
  h1_line INTEGER,
  headings_json TEXT NOT NULL DEFAULT '[]',
  og_json TEXT NOT NULL DEFAULT '{}',
  hreflang_json TEXT NOT NULL DEFAULT '[]',
  images_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS link (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_route_id INTEGER NOT NULL REFERENCES route(id) ON DELETE CASCADE,
  to_url TEXT NOT NULL,
  anchor_text TEXT,
  kind TEXT NOT NULL,
  rel TEXT,
  line INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL REFERENCES route(id) ON DELETE CASCADE,
  schema_type TEXT,
  raw_json TEXT NOT NULL,
  is_valid INTEGER NOT NULL DEFAULT 1,
  validation_error TEXT,
  line INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rule (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  blocks_indexing INTEGER NOT NULL DEFAULT 0,
  source_url TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finding (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES rule(id),
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  blocks_indexing INTEGER NOT NULL DEFAULT 0,
  subject_ref TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER NOT NULL CHECK(line_number >= 1),
  evidence_json TEXT NOT NULL,
  remediation_en TEXT NOT NULL,
  remediation_fr TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  target_timeframe TEXT NOT NULL,
  kpi_en TEXT NOT NULL,
  kpi_fr TEXT NOT NULL,
  official_source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS action (
  id TEXT PRIMARY KEY,
  finding_id TEXT NOT NULL REFERENCES finding(id) ON DELETE CASCADE,
  blocks_indexing INTEGER NOT NULL DEFAULT 0,
  ice_impact INTEGER NOT NULL CHECK(ice_impact BETWEEN 1 AND 10),
  ice_confidence INTEGER NOT NULL CHECK(ice_confidence BETWEEN 1 AND 10),
  ice_effort INTEGER NOT NULL CHECK(ice_effort BETWEEN 1 AND 10),
  ice_score REAL NOT NULL,
  rationale_en TEXT NOT NULL,
  rationale_fr TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  target_timeframe TEXT NOT NULL,
  kpi_en TEXT NOT NULL,
  kpi_fr TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo'
);

CREATE TABLE IF NOT EXISTS decision (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  finding_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_file_project ON file(project_id);
CREATE INDEX IF NOT EXISTS idx_route_project ON route(project_id);
CREATE INDEX IF NOT EXISTS idx_finding_status ON finding(status);
CREATE INDEX IF NOT EXISTS idx_action_priority ON action(blocks_indexing DESC, ice_score DESC);
`;

