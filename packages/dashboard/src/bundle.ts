import type {
  CodeVsCrawlComparisonRow,
  DashboardOverview,
  DecisionRecord,
  ExtractedRouteData,
  Finding,
  PrioritizedAction,
  SupportedLanguage,
} from '@seo-partner/core';
import { getDashboardDictionary } from './lib/i18n.js';
import { escapeHtml, renderSelectFilter, renderTabs } from './components/ui/index.js';
import { renderOverviewFeature } from './components/features/overview-feature.js';
import { renderRoutesSearchFeature } from './components/features/routes-search-feature.js';
import { renderFindingsFeature } from './components/features/findings-feature.js';
import { renderBacklogFeature } from './components/features/backlog-feature.js';
import { renderCrawlComparatorFeature } from './components/features/crawl-comparator-feature.js';
import { renderDecisionsReportsFeature } from './components/features/decisions-reports-feature.js';

export interface DashboardInitialState {
  readonly lang: SupportedLanguage;
  readonly overview: DashboardOverview;
  readonly routes: ReadonlyArray<ExtractedRouteData>;
  readonly findings: ReadonlyArray<Finding>;
  readonly backlog: ReadonlyArray<PrioritizedAction>;
  readonly comparisonRows: ReadonlyArray<CodeVsCrawlComparisonRow>;
  readonly decisions: ReadonlyArray<DecisionRecord>;
}

export function renderDashboardCss(): string {
  return `
:root {
  --bg-primary: #050b08;
  --bg-panel: #0a1510;
  --bg-elevated: #0d1c15;
  --border-emerald: #133928;
  --border-strong: #1e4d38;
  --accent-emerald: #10b981;
  --accent-bright: #34d399;
  --text-main: #f0fdf4;
  --text-muted: #9ca3af;
  --danger-bg: #2a0a0e;
  --danger-border: #7f1d1d;
  --danger-text: #fca5a5;
}
*, *::before, *::after {
  box-sizing: border-box;
}
body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-primary);
  color: var(--text-main);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.dashboard-shell {
  max-width: 1320px;
  margin: 0 auto;
  padding: 28px 24px 48px;
}
header.dashboard-header {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-strong);
  padding: 20px 24px;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand-wordmark {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--accent-bright);
  font-size: 22px;
}
.brand-partner {
  display: inline-block;
  margin-left: 8px;
  color: var(--text-main);
}
.brand-subtitle {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}
.ui-tabs-nav {
  margin-bottom: 20px;
}
.ui-tablist {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ui-tab-btn {
  background-color: var(--bg-panel);
  color: var(--text-main);
  border: 1px solid var(--border-emerald);
  padding: 10px 16px;
  cursor: pointer;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.03em;
}
.ui-tab-btn[aria-selected="true"] {
  background-color: var(--accent-emerald);
  color: #050b08;
  border-color: var(--accent-bright);
  font-weight: 700;
}
.ui-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-emerald);
  padding: 20px 24px;
  margin-bottom: 20px;
}
.ui-card-title {
  color: var(--accent-bright);
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 16px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-emerald);
}
.toolbar-panel {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-emerald);
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.project-title {
  font-size: 16px;
  color: var(--accent-bright);
}
.framework-tag {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 8px;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.kpi-tile {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-emerald);
  padding: 16px 18px;
}
.kpi-tile-blocker {
  border-color: var(--danger-border);
  background-color: var(--danger-bg);
}
.kpi-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.kpi-label-danger {
  color: var(--danger-text);
}
.kpi-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 28px;
  font-weight: 700;
  color: var(--accent-bright);
  margin-top: 6px;
}
.kpi-value-danger {
  color: #f87171;
}
.stat-grid-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.stat-grid-5 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.stat-box {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-emerald);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}
.stat-count, .stat-count-emerald {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  color: var(--accent-bright);
}
.crawl-summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}
.sub-panel {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-emerald);
  padding: 16px;
  margin-bottom: 18px;
}
.sub-panel-title {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent-bright);
  margin-bottom: 12px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 16px;
}
.form-grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}
.form-actions {
  display: flex;
  justify-content: flex-start;
}
.ui-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ui-field-grow {
  flex: 1 1 280px;
}
.ui-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-bright);
}
.ui-label-danger {
  color: var(--danger-text);
}
.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
}
.ui-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-emerald);
}
.ui-input, .ui-select {
  background-color: var(--bg-primary);
  color: var(--text-main);
  border: 1px solid var(--border-emerald);
  padding: 8px 12px;
  font-size: 13px;
}
.ui-btn {
  padding: 9px 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
}
.ui-btn-primary {
  background-color: var(--accent-emerald);
  color: #050b08;
  border: 1px solid var(--accent-bright);
}
.ui-btn-secondary {
  background-color: var(--bg-elevated);
  color: var(--accent-bright);
  border: 1px solid var(--border-strong);
}
.ui-btn:focus-visible, .ui-tab-btn:focus-visible, .ui-input:focus-visible, .ui-select:focus-visible {
  outline: 2px solid var(--accent-bright);
  outline-offset: 2px;
}
.ui-table-wrap {
  overflow-x: auto;
}
.ui-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ui-table th, .ui-table td {
  border: 1px solid var(--border-emerald);
  padding: 10px 12px;
  vertical-align: top;
  text-align: left;
}
.ui-table th {
  background-color: var(--bg-elevated);
  color: var(--accent-bright);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.04em;
}
.ui-table tbody tr:nth-child(even) td {
  background-color: #07110c;
}
.ui-table-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 24px;
}
.mono-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
.cell-subtext {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}
.muted-note {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}
.ice-score-val {
  font-size: 15px;
  color: var(--accent-bright);
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--accent-bright);
}
a {
  color: var(--accent-bright);
  text-decoration: underline;
}
.ui-badge {
  display: inline-block;
  padding: 2px 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  border: 1px solid transparent;
}
.ui-badge-critical {
  background-color: #dc2626;
  color: #ffffff;
}
.ui-badge-high {
  background-color: #ea580c;
  color: #ffffff;
}
.ui-badge-medium {
  background-color: #ca8a04;
  color: #050b08;
}
.ui-badge-low {
  background-color: #10b981;
  color: #050b08;
}
.ui-badge-blocker {
  background-color: #7f1d1d;
  color: #ffffff;
  border-color: #f87171;
}
.ui-badge-neutral {
  background-color: var(--bg-elevated);
  color: var(--accent-bright);
  border-color: var(--border-emerald);
}
.ui-alert {
  border: 1px solid var(--border-emerald);
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 13px;
}
.ui-alert-info {
  background-color: var(--bg-elevated);
  border-color: var(--border-strong);
  color: var(--text-main);
}
.ui-alert-success {
  background-color: var(--bg-elevated);
  border-color: var(--accent-emerald);
  color: var(--accent-bright);
}
.ui-alert-error {
  background-color: var(--danger-bg);
  border-color: var(--danger-border);
  color: var(--danger-text);
}
.fts-results-panel {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-strong);
  padding: 14px 16px;
  margin-bottom: 16px;
}
.fts-list, .divergence-list {
  margin: 8px 0 0 0;
  padding-left: 18px;
}
.fts-list-item {
  margin-bottom: 6px;
}
.tab-panel[hidden] {
  display: none;
}
`.trim();
}

export function renderDashboardClientScript(): string {
  return `
(function() {
  const tabButtons = document.querySelectorAll('.ui-tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const targetId = btn.getAttribute('data-target-panel');
      tabButtons.forEach(function(b) {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      tabPanels.forEach(function(panel) {
        if (panel.id === targetId) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', 'hidden');
        }
      });
    });
  });

  async function apiCall(endpoint, options) {
    const res = await fetch(endpoint, Object.assign({ credentials: 'include' }, options || {}, {
      headers: Object.assign({ 'Content-Type': 'application/json' }, (options && options.headers) || {})
    }));
    if (res.status === 401 || res.status === 403) {
      await fetch('/api/v1/session', { credentials: 'include' });
    }
    return res.json();
  }

  const langSelect = document.getElementById('select-dashboard-lang');
  if (langSelect) {
    langSelect.addEventListener('change', function(e) {
      const val = e.target.value;
      window.location.search = '?lang=' + encodeURIComponent(val);
    });
  }

  const scanBtn = document.getElementById('btn-run-scan-audit');
  if (scanBtn) {
    scanBtn.addEventListener('click', async function() {
      scanBtn.setAttribute('aria-busy', 'true');
      await apiCall('/api/v1/scan', { method: 'POST', body: JSON.stringify({}) });
      await apiCall('/api/v1/audit', { method: 'POST', body: JSON.stringify({}) });
      window.location.reload();
    });
  }

  const searchForm = document.getElementById('form-fts-search');
  if (searchForm) {
    searchForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const input = document.getElementById('input-fts-query');
      const container = document.getElementById('fts-results-container');
      if (!input || !container) return;
      const q = input.value.trim();
      if (!q) return;
      const payload = await apiCall('/api/v1/search?q=' + encodeURIComponent(q));
      if (payload && payload.success && payload.data) {
        const items = payload.data.results.map(function(r) {
          return '<li class="fts-list-item"><code>' + r.routePattern + '</code> — ' + (r.title || '') + '</li>';
        }).join('');
        container.innerHTML = '<div class="fts-results-panel"><strong>FTS5 (' + payload.data.durationMs + ' ms):</strong><ul class="fts-list">' + items + '</ul></div>';
      }
    });
  }

  function applyFindingsTableFilter() {
    const catEl = document.getElementById('filter-finding-category');
    const sevEl = document.getElementById('filter-finding-severity');
    const blkEl = document.getElementById('filter-finding-blockers');
    const table = document.getElementById('table-findings-list');
    if (!table) return;
    const cat = catEl ? catEl.value : '';
    const sev = sevEl ? sevEl.value : '';
    const blk = blkEl ? blkEl.checked : false;
    const rows = table.querySelectorAll('tbody tr[data-category]');
    rows.forEach(function(row) {
      const matchCat = !cat || row.getAttribute('data-category') === cat;
      const matchSev = !sev || row.getAttribute('data-severity') === sev;
      const matchBlk = !blk || row.getAttribute('data-blocker') === 'true';
      row.style.display = (matchCat && matchSev && matchBlk) ? '' : 'none';
    });
  }

  ['filter-finding-category', 'filter-finding-severity', 'filter-finding-blockers'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyFindingsTableFilter);
  });

  function applyBacklogTableFilter() {
    const roleEl = document.getElementById('filter-backlog-role');
    const tfEl = document.getElementById('filter-backlog-timeframe');
    const table = document.getElementById('table-ice-backlog');
    if (!table) return;
    const role = roleEl ? roleEl.value : '';
    const tf = tfEl ? tfEl.value : '';
    const rows = table.querySelectorAll('tbody tr[data-owner]');
    rows.forEach(function(row) {
      const matchRole = !role || row.getAttribute('data-owner') === role;
      const matchTf = !tf || row.getAttribute('data-timeframe') === tf;
      row.style.display = (matchRole && matchTf) ? '' : 'none';
    });
  }

  ['filter-backlog-role', 'filter-backlog-timeframe'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyBacklogTableFilter);
  });

  const crawlForm = document.getElementById('form-trigger-crawl');
  if (crawlForm) {
    crawlForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const urlInput = document.getElementById('input-crawl-url');
      const allowLocalInput = document.getElementById('input-crawl-allow-local');
      const statusMsg = document.getElementById('crawl-status-msg');
      if (!urlInput) return;
      if (statusMsg) statusMsg.textContent = 'Crawl HTTP en cours...';
      const payload = await apiCall('/api/v1/crawls', {
        method: 'POST',
        body: JSON.stringify({
          startUrl: urlInput.value.trim(),
          allowLocal: Boolean(allowLocalInput && allowLocalInput.checked)
        })
      });
      if (payload && payload.success) {
        window.location.reload();
      } else if (statusMsg) {
        statusMsg.textContent = (payload && payload.error) || 'Erreur lors du crawl';
      }
    });
  }

  const decisionForm = document.getElementById('form-add-decision');
  if (decisionForm) {
    decisionForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const titleInput = document.getElementById('input-decision-title');
      const ratInput = document.getElementById('input-decision-rationale');
      if (!titleInput || !ratInput) return;
      const payload = await apiCall('/api/v1/decisions', {
        method: 'POST',
        body: JSON.stringify({
          title: titleInput.value.trim(),
          rationale: ratInput.value.trim()
        })
      });
      if (payload && payload.success) {
        window.location.reload();
      }
    });
  }

  const reportForm = document.getElementById('form-export-report');
  if (reportForm) {
    reportForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const fmtSelect = document.getElementById('select-report-format');
      const resBox = document.getElementById('report-export-result');
      const fmt = fmtSelect ? fmtSelect.value : 'html';
      const payload = await apiCall('/api/v1/reports', {
        method: 'POST',
        body: JSON.stringify({ format: fmt, reportType: 'audit-complet' })
      });
      if (payload && payload.success && payload.data && resBox) {
        resBox.textContent = 'Rapport genere : ' + payload.data.filePath;
      }
    });
  }
})();
`.trim();
}

export function renderDashboardSpaHtml(state: DashboardInitialState): string {
  const dict = getDashboardDictionary(state.lang);

  const tabsHtml = renderTabs(dict.navLabel, [
    { id: 'tab-btn-overview', label: dict.tabOverview, panelId: 'panel-overview', active: true },
    { id: 'tab-btn-routes', label: dict.tabRoutes, panelId: 'panel-routes' },
    { id: 'tab-btn-findings', label: dict.tabFindings, panelId: 'panel-findings' },
    { id: 'tab-btn-backlog', label: dict.tabBacklog, panelId: 'panel-backlog' },
    { id: 'tab-btn-crawl', label: dict.tabCrawl, panelId: 'panel-crawl' },
    { id: 'tab-btn-decisions', label: dict.tabDecisions, panelId: 'panel-decisions' },
  ]);

  const langSwitcherHtml = renderSelectFilter({
    id: 'select-dashboard-lang',
    label: dict.langLabel,
    selectedValue: state.lang,
    options: [
      { value: 'fr', label: 'Francais (FR)' },
      { value: 'en', label: 'English (EN)' },
    ],
  });

  const overviewPanel = renderOverviewFeature(state.overview, state.lang);
  const routesPanel = renderRoutesSearchFeature(state.routes, state.lang);
  const findingsPanel = renderFindingsFeature(state.findings, state.lang);
  const backlogPanel = renderBacklogFeature(state.backlog, state.lang);
  const crawlPanel = renderCrawlComparatorFeature(
    state.comparisonRows,
    state.overview.latestCrawlRun,
    state.lang,
  );
  const decisionsPanel = renderDecisionsReportsFeature(state.decisions, state.lang);

  return `<!DOCTYPE html>
<html lang="${escapeHtml(state.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SEO PARTNER v0.3 — Local Dashboard (${escapeHtml(state.overview.project?.name ?? 'seo-project')})</title>
  <style>${renderDashboardCss()}</style>
</head>
<body>
  <div class="dashboard-shell">
    <header class="dashboard-header" role="banner">
      <div>
        <div class="brand-wordmark">SEO<span class="brand-partner">PARTNER</span></div>
        <div class="brand-subtitle">${escapeHtml(dict.brandSubtitle)}</div>
      </div>
      <div>${langSwitcherHtml}</div>
    </header>

    ${tabsHtml}

    <main id="dashboard-main" role="main">
      <div id="panel-overview" role="tabpanel" aria-labelledby="tab-btn-overview" class="tab-panel">
        ${overviewPanel}
      </div>
      <div id="panel-routes" role="tabpanel" aria-labelledby="tab-btn-routes" class="tab-panel" hidden>
        ${routesPanel}
      </div>
      <div id="panel-findings" role="tabpanel" aria-labelledby="tab-btn-findings" class="tab-panel" hidden>
        ${findingsPanel}
      </div>
      <div id="panel-backlog" role="tabpanel" aria-labelledby="tab-btn-backlog" class="tab-panel" hidden>
        ${backlogPanel}
      </div>
      <div id="panel-crawl" role="tabpanel" aria-labelledby="tab-btn-crawl" class="tab-panel" hidden>
        ${crawlPanel}
      </div>
      <div id="panel-decisions" role="tabpanel" aria-labelledby="tab-btn-decisions" class="tab-panel" hidden>
        ${decisionsPanel}
      </div>
    </main>
  </div>
  <script>${renderDashboardClientScript()}</script>
</body>
</html>`;
}
