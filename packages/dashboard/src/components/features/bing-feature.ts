import type { BingPerformanceRecord, SupportedLanguage } from '@seo-partner/core';
import { escapeHtml } from '../ui/index.js';

export interface BingFeatureProps {
  readonly lang: SupportedLanguage;
  readonly performanceRecords?: ReadonlyArray<BingPerformanceRecord>;
  readonly siteUrl?: string;
  readonly fromCache?: boolean;
  readonly expiresAt?: string;
}

export function renderBingFeature(props: BingFeatureProps): string {
  const isFr = props.lang === 'fr';
  const records = props.performanceRecords ?? [];

  const title = 'Bing Webmaster Tools (M9)';
  const subtitle = isFr
    ? 'Donnees de requetes, clics, impressions et positions moyennes indexees par Bing. Cache local SQLite TTL 7 jours.'
    : 'Search queries, clicks, impressions and average positions indexed by Bing. Local SQLite 7-day TTL cache.';

  const totalClicks = records.reduce((acc, r) => acc + r.clicks, 0);
  const totalImpressions = records.reduce((acc, r) => acc + r.impressions, 0);
  const avgPos = records.length > 0
    ? (records.reduce((acc, r) => acc + r.position, 0) / records.length).toFixed(1)
    : '-';
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  const cacheStatusText = props.fromCache
    ? (isFr ? 'Donnees lues depuis le cache local (TTL 7 jours)' : 'Data loaded from local cache (7-day TTL)')
    : (isFr ? 'Donnees synchronisees en direct depuis l\'API Bing' : 'Data synced live from Bing API');

  const tableRows =
    records.length === 0
      ? `<tr><td colspan="5" class="ui-table-empty">${
          isFr
            ? 'Aucune donnee Bing synchronisee. Executez `seo-partner bing sync --site <url>` pour synchroniser.'
            : 'No Bing data synchronized. Run `seo-partner bing sync --site <url>` to sync.'
        }</td></tr>`
      : records
          .slice(0, 50)
          .map((r) => {
            return `<tr>
              <td><code>${escapeHtml(r.query || '(requete globale)')}</code></td>
              <td style="text-align: right;">${r.clicks}</td>
              <td style="text-align: right;">${r.impressions}</td>
              <td style="text-align: right;">${(r.ctr * 100).toFixed(1)}%</td>
              <td style="text-align: right;">${r.position.toFixed(1)}</td>
            </tr>`;
          })
          .join('\n');

  return `<div class="feature-panel bing-panel">
    <div class="panel-header">
      <h2 class="panel-title">${escapeHtml(title)}</h2>
      <p class="panel-subtitle">${escapeHtml(subtitle)}</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 16px 0;">
      <div class="ui-card" style="padding: 12px; border: 1px solid var(--border-color); background: var(--bg-card); border-radius: 4px;">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">${isFr ? 'Clics totaux' : 'Total Clicks'}</div>
        <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">${totalClicks}</div>
      </div>
      <div class="ui-card" style="padding: 12px; border: 1px solid var(--border-color); background: var(--bg-card); border-radius: 4px;">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">${isFr ? 'Impressions' : 'Impressions'}</div>
        <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">${totalImpressions}</div>
      </div>
      <div class="ui-card" style="padding: 12px; border: 1px solid var(--border-color); background: var(--bg-card); border-radius: 4px;">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">${isFr ? 'CTR moyen' : 'Average CTR'}</div>
        <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">${avgCtr}%</div>
      </div>
      <div class="ui-card" style="padding: 12px; border: 1px solid var(--border-color); background: var(--bg-card); border-radius: 4px;">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">${isFr ? 'Position moyenne' : 'Avg Position'}</div>
        <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">${avgPos}</div>
      </div>
    </div>

    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
      ${escapeHtml(cacheStatusText)}${props.expiresAt ? ` - Expiration : ${escapeHtml(props.expiresAt)}` : ''}
    </div>

    <div class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>${isFr ? 'Requete' : 'Query'}</th>
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

