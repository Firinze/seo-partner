import type { DashboardOverview, SupportedLanguage } from '@seo-partner/core';
import { getDashboardDictionary } from '../../lib/i18n.js';
import { escapeHtml, renderBadge, renderButton, renderCard } from '../ui/index.js';

export function renderOverviewFeature(
  overview: DashboardOverview,
  lang: SupportedLanguage,
): string {
  const dict = getDashboardDictionary(lang);
  const { stats, latestCrawlRun } = overview;

  const kpiCardsHtml = `<div class="kpi-grid">
    <article class="kpi-tile">
      <div class="kpi-label">${escapeHtml(dict.kpiRoutes)}</div>
      <div id="kpi-routes-val" class="kpi-value">${stats.routesCount}</div>
    </article>
    <article class="kpi-tile">
      <div class="kpi-label">${escapeHtml(dict.kpiFiles)}</div>
      <div id="kpi-files-val" class="kpi-value">${stats.filesScanned}</div>
    </article>
    <article class="kpi-tile kpi-tile-blocker">
      <div class="kpi-label kpi-label-danger">${escapeHtml(dict.kpiBlockers)}</div>
      <div id="kpi-blockers-val" class="kpi-value kpi-value-danger">${stats.blockingIndexingCount}</div>
    </article>
    <article class="kpi-tile">
      <div class="kpi-label">${escapeHtml(dict.kpiFindings)}</div>
      <div id="kpi-findings-val" class="kpi-value">${stats.totalFindings}</div>
    </article>
    <article class="kpi-tile">
      <div class="kpi-label">${escapeHtml(dict.kpiDecisions)}</div>
      <div id="kpi-decisions-val" class="kpi-value">${stats.decisionsCount}</div>
    </article>
  </div>`;

  const actionToolbarHtml = `<div class="toolbar-panel">
    <div class="toolbar-meta">
      <strong class="project-title">${escapeHtml(overview.project?.name ?? 'seo-project')}</strong>
      <span class="framework-tag">[${escapeHtml((overview.project?.frameworks ?? []).join(', ') || 'static')}]</span>
    </div>
    <div>
      ${renderButton({ id: 'btn-run-scan-audit', label: dict.btnScanAudit })}
    </div>
  </div>`;

  const severityHtml = renderCard({
    id: 'card-severity-breakdown',
    title: dict.severityBreakdownTitle,
    childrenHtml: `<div class="stat-grid-4">
      <div class="stat-box">
        ${renderBadge({ label: lang === 'fr' ? 'CRITIQUE' : 'CRITICAL', variant: 'critical' })}
        <strong class="stat-count">${stats.bySeverity.critical}</strong>
      </div>
      <div class="stat-box">
        ${renderBadge({ label: lang === 'fr' ? 'HAUTE' : 'HIGH', variant: 'high' })}
        <strong class="stat-count">${stats.bySeverity.high}</strong>
      </div>
      <div class="stat-box">
        ${renderBadge({ label: lang === 'fr' ? 'MOYENNE' : 'MEDIUM', variant: 'medium' })}
        <strong class="stat-count">${stats.bySeverity.medium}</strong>
      </div>
      <div class="stat-box">
        ${renderBadge({ label: lang === 'fr' ? 'FAIBLE' : 'LOW', variant: 'low' })}
        <strong class="stat-count">${stats.bySeverity.low}</strong>
      </div>
    </div>`,
  });

  const categoryHtml = renderCard({
    id: 'card-category-breakdown',
    title: dict.categoryBreakdownTitle,
    childrenHtml: `<div class="stat-grid-5">
      <div class="stat-box"><span>${lang === 'fr' ? 'Technique' : 'Technical'}</span><strong class="stat-count-emerald">${stats.byCategory.technical}</strong></div>
      <div class="stat-box"><span>${lang === 'fr' ? 'Contenu & Balises' : 'On-Page'}</span><strong class="stat-count-emerald">${stats.byCategory['on-page']}</strong></div>
      <div class="stat-box"><span>${lang === 'fr' ? 'Données structurées' : 'Schema.org'}</span><strong class="stat-count-emerald">${stats.byCategory.schema}</strong></div>
      <div class="stat-box"><span>${lang === 'fr' ? 'SEO Local' : 'Local SEO'}</span><strong class="stat-count-emerald">${stats.byCategory.local}</strong></div>
      <div class="stat-box"><span>${lang === 'fr' ? 'International & IA' : 'GEO / Intl'}</span><strong class="stat-count-emerald">${stats.byCategory.geo}</strong></div>
    </div>`,
  });

  const crawlContent = latestCrawlRun
    ? `<div class="crawl-summary-row">
        <div>Run ID: <code>${escapeHtml(latestCrawlRun.id)}</code></div>
        <div>URL: <code>${escapeHtml(latestCrawlRun.startUrl)}</code></div>
        <div>Status: <strong>${escapeHtml(latestCrawlRun.status)}</strong></div>
        <div>Pages: <strong>${latestCrawlRun.pagesCrawled}</strong></div>
        <div>Errors: <strong>${latestCrawlRun.errorsCount}</strong></div>
      </div>`
    : `<p class="muted-note">${escapeHtml(dict.noCrawlYet)}</p>`;

  const crawlCardHtml = renderCard({
    id: 'card-latest-crawl',
    title: dict.latestCrawlTitle,
    childrenHtml: crawlContent,
  });

  return `<div id="feature-overview">${actionToolbarHtml}${kpiCardsHtml}${severityHtml}${categoryHtml}${crawlCardHtml}</div>`;
}
