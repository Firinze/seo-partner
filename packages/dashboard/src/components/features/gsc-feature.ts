import type { GscPerformanceRecord, GscInspectionRecord, SupportedLanguage } from '@seo-partner/core';
import { escapeHtml } from '../ui/index.js';

export interface GscFeatureProps {
  readonly lang: SupportedLanguage;
  readonly performanceRecords?: ReadonlyArray<GscPerformanceRecord>;
  readonly inspectionRecords?: ReadonlyArray<GscInspectionRecord>;
}

export function renderGscFeature(props: GscFeatureProps): string {
  const isFr = props.lang === 'fr';
  const records = props.performanceRecords ?? [];

  const title = isFr ? 'Google Search Console (GSC)' : 'Google Search Console (GSC)';
  const subtitle = isFr
    ? 'Donnees de performance reelle (requetes, clics, impressions, CTR et position moyenne) et indexation.'
    : 'Real search performance data (queries, clicks, impressions, CTR and average position) and indexing status.';

  const tableRows =
    records.length === 0
      ? `<tr><td colspan="6" class="ui-table-empty">${
          isFr
            ? 'Aucune donnee GSC synchronisee. Executez `seo-partner gsc sync --site <url>` pour synchroniser.'
            : 'No GSC data synchronized. Run `seo-partner gsc sync --site <url>` to sync.'
        }</td></tr>`
      : records
          .slice(0, 50)
          .map((r) => {
            return `<tr>
              <td><code>${escapeHtml(r.query || '(sans requete)')}</code></td>
              <td><code>${escapeHtml(r.url || '/')}</code></td>
              <td style="text-align: right;">${r.clicks}</td>
              <td style="text-align: right;">${r.impressions}</td>
              <td style="text-align: right;">${(r.ctr * 100).toFixed(1)}%</td>
              <td style="text-align: right;">${r.position.toFixed(1)}</td>
            </tr>`;
          })
          .join('\n');

  return `<div class="feature-panel gsc-panel">
    <div class="panel-header">
      <h2 class="panel-title">${escapeHtml(title)}</h2>
      <p class="panel-subtitle">${escapeHtml(subtitle)}</p>
    </div>

    <div class="ui-table-wrap" style="margin-top: 16px;">
      <table class="ui-table">
        <thead>
          <tr>
            <th>${isFr ? 'Requete' : 'Query'}</th>
            <th>${isFr ? 'Page' : 'Page'}</th>
            <th style="text-align: right;">${isFr ? 'Clics' : 'Clicks'}</th>
            <th style="text-align: right;">${isFr ? 'Impressions' : 'Impressions'}</th>
            <th style="text-align: right;">CTR</th>
            <th style="text-align: right;">${isFr ? 'Position' : 'Position'}</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  </div>`;
}
