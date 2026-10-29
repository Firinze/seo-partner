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

    <div class="ui-card" style="margin-top: 16px; padding: 16px; border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px;">
      <h3 style="margin-top: 0; font-size: 15px; font-weight: 600;">
        ${isFr ? 'Demarche officielle : Comment faire indexer vos pages sur Google et Bing ?' : 'Official Workflow: How to Get Your Pages Indexed on Google & Bing?'}
      </h3>
      <div style="font-size: 13px; line-height: 1.6; color: var(--text-muted, #475569); margin-top: 8px;">
        <p style="margin: 6px 0;">
          <strong>1. ${isFr ? 'Controle prealable' : 'Pre-check'} :</strong>
          ${isFr ? 'Assurez-vous avec `seo-partner audit` que vos pages ne comportent aucun blocage d indexation (balise noindex accidentelle, robots.txt bloquant, lien canonique invalide).' : 'Ensure `seo-partner audit` reports zero blockers (no accidental noindex, blocking robots.txt, or broken canonicals).'}
        </p>
        <p style="margin: 6px 0;">
          <strong>2. ${isFr ? 'Indexation globale automatique (Google)' : 'Automated site-wide indexing (Google)'} :</strong>
          ${isFr ? 'Dans Google Search Console, rendez-vous dans le menu <em>Sitemaps</em> et declarez l URL de votre fichier sitemap (ex. <code>https://votresite.com/sitemap.xml</code>). C est la methode officielle recommandee par Google pour decouvrir et indexer l ensemble de vos pages.' : 'In Google Search Console, navigate to <em>Sitemaps</em> and submit your sitemap URL (e.g. <code>https://yourdomain.com/sitemap.xml</code>). This is Google official recommended method to discover and crawl all pages.'}
        </p>
        <p style="margin: 6px 0;">
          <strong>3. ${isFr ? 'Indexation prioritaire d une page specifique (Google)' : 'Priority indexing for an individual page (Google)'} :</strong>
          ${isFr ? 'Google ne propose pas d API publique pour automatiser le bouton d indexation manuelle. Pour une page urgente (lancement, refonte), collez son URL dans la barre d inspection tout en haut de Google Search Console, puis cliquez sur <em>Demander une indexation</em>.' : 'Google does not expose a public API for manual indexing requests. For an urgent page, paste its URL into Search Console top inspection bar and click <em>Request Indexing</em>.'}
        </p>
        <p style="margin: 6px 0;">
          <strong>4. ${isFr ? 'Indexation instantanee par API (Bing & IndexNow)' : 'Instant API Indexing (Bing & IndexNow)'} :</strong>
          ${isFr ? 'Sur Bing, vous pouvez soumettre vos URLs directement par API avec `seo-partner bing indexnow`. Bing et ses moteurs partenaires (Yahoo, Yandex) sont notifies en quelques secondes.' : 'On Bing, you can submit fresh URLs directly via API with `seo-partner bing indexnow`. Bing and partner engines are notified in seconds.'}
        </p>
      </div>
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
