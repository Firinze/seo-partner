import type {
  ExtractedRouteData,
  FtsSearchResult,
  SupportedLanguage,
} from '@seo-partner/core';
import { getDashboardDictionary, getRouterKindLabel } from '../../lib/i18n.js';
import {
  escapeHtml,
  renderBadge,
  renderButton,
  renderCard,
  renderDataTable,
  renderSearchInput,
} from '../ui/index.js';

export function renderRoutesSearchFeature(
  routes: ReadonlyArray<ExtractedRouteData>,
  lang: SupportedLanguage,
  ftsResults?: ReadonlyArray<FtsSearchResult>,
  activeQuery?: string,
): string {
  const dict = getDashboardDictionary(lang);

  const searchBarHtml = `<form id="form-fts-search" class="filter-bar">
    ${renderSearchInput({
      id: 'input-fts-query',
      label: dict.tabRoutes,
      placeholder: dict.searchPlaceholder,
      value: activeQuery ?? '',
    })}
    ${renderButton({ id: 'btn-fts-search', label: dict.searchButton, type: 'submit' })}
  </form>`;

  const ftsBlockHtml =
    ftsResults !== undefined
      ? `<div id="fts-results-container" class="fts-results-panel">
          <div class="ui-label">${lang === 'fr' ? 'Résultats de recherche' : 'Search Results'} (${ftsResults.length})</div>
          ${
            ftsResults.length === 0
              ? `<p class="muted-note">${escapeHtml(dict.emptyStateMessage)}</p>`
              : `<ul class="fts-list">
                  ${ftsResults
                    .map(
                      (hit) => `<li class="fts-list-item">
                        <code>${escapeHtml(hit.routePattern)}</code>
                        — <span>${escapeHtml(hit.title ?? '—')}</span>
                        <div class="cell-subtext">${escapeHtml(hit.headingsText ?? '')}</div>
                      </li>`,
                    )
                    .join('')}
                </ul>`
          }
        </div>`
      : `<div id="fts-results-container"></div>`;

  const rowsHtml = routes.map((item) => {
    const firstH1 = item.headings.find((h) => h.level === 1)?.text ?? '—';
    const langVal = item.htmlLang?.value ?? '—';
    const sitemapBadge = item.route.inSitemap
      ? renderBadge({ label: lang === 'fr' ? 'Oui' : 'YES', variant: 'low' })
      : renderBadge({ label: lang === 'fr' ? 'Non' : 'NO', variant: 'neutral' });
    return `<tr>
      <td><code>${escapeHtml(item.route.pattern)}</code><div class="cell-subtext">${escapeHtml(item.route.filePath)}</div></td>
      <td>${renderBadge({ label: getRouterKindLabel(item.route.routerKind), variant: 'neutral' })}</td>
      <td>${escapeHtml(item.title?.value ?? '—')}</td>
      <td>${escapeHtml(firstH1)}</td>
      <td class="mono-cell">${escapeHtml(langVal)}</td>
      <td>${sitemapBadge}</td>
    </tr>`;
  });

  const tableHtml = renderDataTable({
    id: 'table-routes-explorer',
    caption: dict.tabRoutes,
    headers: [
      dict.colRoute,
      dict.colRouter,
      dict.colTitle,
      dict.colH1,
      dict.colLang,
      dict.colSitemap,
    ],
    rowsHtml,
    emptyMessage: dict.emptyStateMessage,
  });

  return renderCard({
    id: 'feature-routes-search',
    title: dict.tabRoutes,
    childrenHtml: `${searchBarHtml}${ftsBlockHtml}${tableHtml}`,
  });
}
