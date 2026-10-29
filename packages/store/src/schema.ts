export const SCHEMA_VERSION = 5;

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
  in_sitemap INTEGER NOT NULL DEFAULT 0,
  is_dynamic INTEGER NOT NULL DEFAULT 0
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
  html_lang TEXT,
  html_lang_line INTEGER,
  h1_count INTEGER NOT NULL DEFAULT 0,
  h1_first_text TEXT,
  h1_line INTEGER,
  headings_json TEXT NOT NULL DEFAULT '[]',
  og_json TEXT NOT NULL DEFAULT '{}',
  hreflang_json TEXT NOT NULL DEFAULT '[]',
  images_json TEXT NOT NULL DEFAULT '[]',
  is_dynamic INTEGER NOT NULL DEFAULT 0
);

CREATE VIRTUAL TABLE IF NOT EXISTS fts_page_index USING fts5(
  route_id UNINDEXED,
  route_pattern,
  title,
  description,
  headings_text
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

CREATE TABLE IF NOT EXISTS crawl_run (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  start_url TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running',
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS crawl_page (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crawl_run_id TEXT NOT NULL REFERENCES crawl_run(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  route_pattern TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  redirect_chain_json TEXT NOT NULL DEFAULT '[]',
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  depth INTEGER NOT NULL DEFAULT 0,
  x_robots_tag TEXT,
  http_canonical TEXT,
  title TEXT,
  description TEXT,
  canonical TEXT,
  robots_meta TEXT,
  h1 TEXT,
  html_lang TEXT,
  og_json TEXT NOT NULL DEFAULT '{}',
  hreflang_json TEXT NOT NULL DEFAULT '[]',
  internal_links_json TEXT NOT NULL DEFAULT '[]',
  broken_links_json TEXT NOT NULL DEFAULT '[]',
  untrusted_external INTEGER NOT NULL DEFAULT 1,
  crawled_at TEXT NOT NULL,
  UNIQUE(crawl_run_id, url)
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

CREATE INDEX IF NOT EXISTS idx_file_project ON file(project_id);
CREATE INDEX IF NOT EXISTS idx_route_project ON route(project_id);
CREATE INDEX IF NOT EXISTS idx_crawl_run_project ON crawl_run(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_page_run ON crawl_page(crawl_run_id);
CREATE INDEX IF NOT EXISTS idx_finding_status ON finding(status);
CREATE INDEX IF NOT EXISTS idx_action_priority ON action(blocks_indexing DESC, ice_score DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_perf_proj_url ON gsc_performance (project_id, url);
CREATE INDEX IF NOT EXISTS idx_gsc_perf_query ON gsc_performance (project_id, query);
CREATE INDEX IF NOT EXISTS idx_gsc_insp_proj_url ON gsc_inspection (project_id, url);
CREATE INDEX IF NOT EXISTS idx_cwv_proj_url ON cwv_metrics (project_id, url, form_factor);
CREATE INDEX IF NOT EXISTS idx_agent_session_proj ON agent_run_session (project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_step_session ON agent_step_log (session_id, step_index ASC);
CREATE INDEX IF NOT EXISTS idx_watch_entry_source ON watch_entry(source_id, pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_watch_entry_confirmed ON watch_entry(confirmed);
CREATE INDEX IF NOT EXISTS idx_bing_perf_project_url ON bing_performance(project_id, url);
CREATE INDEX IF NOT EXISTS idx_bing_perf_query ON bing_performance(project_id, query);
CREATE INDEX IF NOT EXISTS idx_bing_insp_project_url ON bing_inspection(project_id, url);
`;
