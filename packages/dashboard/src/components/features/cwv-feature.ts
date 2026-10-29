import type { CwvMetricRecord, SupportedLanguage } from '@seo-partner/core';
import { escapeHtml } from '../ui/index.js';

export interface CwvFeatureProps {
  readonly lang: SupportedLanguage;
  readonly metrics?: ReadonlyArray<CwvMetricRecord>;
}

export function renderCwvFeature(props: CwvFeatureProps): string {
  const isFr = props.lang === 'fr';
  const metrics = props.metrics ?? [];

  const title = isFr ? 'Signaux Web Essentiels (Core Web Vitals)' : 'Core Web Vitals (CrUX & PageSpeed)';
  const subtitle = isFr
    ? 'Metriques de performance sur le terrain (LCP, INP, CLS, FCP, TTFB) avec seuils Google conformes et cache local 7 jours.'
    : 'Field performance metrics (LCP, INP, CLS, FCP, TTFB) with standard Google thresholds and 7-day local cache.';

  const formatRatingBadge = (rating: string | null) => {
    if (!rating) return `<span class="ui-badge ui-badge-neutral">N/A</span>`;
    if (rating === 'good') {
      return `<span class="ui-badge ui-badge-low">${isFr ? 'Bon' : 'GOOD'}</span>`;
    }
    if (rating === 'needs-improvement') {
      return `<span class="ui-badge ui-badge-medium">${isFr ? 'À améliorer' : 'NEEDS IMPR'}</span>`;
    }
    return `<span class="ui-badge ui-badge-critical">${isFr ? 'Critique / Mauvais' : 'POOR'}</span>`;
  };

  const rows =
    metrics.length === 0
      ? `<tr><td colspan="8" class="ui-table-empty">${
          isFr
            ? 'Aucune metrique CWV enregistree. Executez `seo-partner cwv fetch --url <url>` pour interroger CrUX / PageSpeed.'
            : 'No CWV metrics recorded. Run `seo-partner cwv fetch --url <url>` to query CrUX / PageSpeed.'
        }</td></tr>`
      : metrics
          .map((m) => {
            const lcp = m.lcpMs != null ? `${m.lcpMs}ms` : '-';
            const inp = m.inpMs != null ? `${m.inpMs}ms` : '-';
            const cls = m.clsScore != null ? `${m.clsScore.toFixed(3)}` : '-';
            const ttfb = m.ttfbMs != null ? `${m.ttfbMs}ms` : '-';

            return `<tr>
              <td><code>${escapeHtml(m.url)}</code></td>
              <td><span class="ui-badge ui-badge-neutral">${m.formFactor}</span></td>
              <td><span class="ui-badge ui-badge-neutral">${m.scope}</span></td>
              <td>${lcp} ${formatRatingBadge(m.lcpRating)}</td>
              <td>${inp} ${formatRatingBadge(m.inpRating)}</td>
              <td>${cls} ${formatRatingBadge(m.clsRating)}</td>
              <td>${ttfb} ${formatRatingBadge(m.ttfbRating)}</td>
              <td style="font-size: 11px; color: var(--text-muted);">${m.fetchedAt.slice(0, 10)}</td>
            </tr>`;
          })
          .join('\n');

  return `<div class="feature-panel cwv-panel">
    <div class="panel-header">
      <h2 class="panel-title">${escapeHtml(title)}</h2>
      <p class="panel-subtitle">${escapeHtml(subtitle)}</p>
    </div>

    <div class="ui-table-wrap" style="margin-top: 16px;">
      <table class="ui-table">
        <thead>
          <tr>
            <th>URL</th>
            <th>${isFr ? 'Appareil' : 'Device'}</th>
            <th>Scope</th>
            <th>LCP (&le; 2.5s)</th>
            <th>INP (&le; 200ms)</th>
            <th>CLS (&le; 0.1)</th>
            <th>TTFB (&le; 800ms)</th>
            <th>${isFr ? 'Collecte' : 'Fetched'}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </div>`;
}

