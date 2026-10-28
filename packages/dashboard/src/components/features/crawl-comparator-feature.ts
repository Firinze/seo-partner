import type {
  CodeVsCrawlComparisonRow,
  CrawlRun,
  SupportedLanguage,
} from '@seo-partner/core';
import { getDashboardDictionary } from '../../lib/i18n.js';
import {
  escapeHtml,
  renderBadge,
  renderButton,
  renderCard,
  renderDataTable,
} from '../ui/index.js';

export function renderCrawlComparatorFeature(
  rows: ReadonlyArray<CodeVsCrawlComparisonRow>,
  crawlRun: CrawlRun | null,
  lang: SupportedLanguage,
): string {
  const dict = getDashboardDictionary(lang);

  const crawlTriggerFormHtml = `<form id="form-trigger-crawl" class="sub-panel">
    <div class="sub-panel-title">${escapeHtml(dict.crawlFormTitle)}</div>
    <div class="filter-bar">
      <div class="ui-field ui-field-grow">
        <label for="input-crawl-url" class="ui-label">${escapeHtml(dict.crawlUrlLabel)}</label>
        <input id="input-crawl-url" type="url" required placeholder="http://mon-projet.test" value="${escapeHtml(crawlRun?.startUrl ?? 'http://127.0.0.1:8000')}" class="ui-input" />
      </div>
      <div class="checkbox-field">
        <input id="input-crawl-allow-local" type="checkbox" checked class="ui-checkbox" />
        <label for="input-crawl-allow-local" class="ui-label">${escapeHtml(dict.crawlAllowLocalLabel)}</label>
      </div>
      ${renderButton({ id: 'btn-trigger-crawl', label: dict.crawlStartButton, type: 'submit' })}
    </div>
    <div id="crawl-status-msg" class="cell-subtext" role="status" aria-live="polite"></div>
  </form>`;

  const rowsHtml = rows.map((row) => {
    const codeHtml = row.code
      ? `<div class="mono-cell">
          <div>Title: <code>${escapeHtml(row.code.title ?? '—')}</code></div>
          <div>H1: <code>${escapeHtml(row.code.h1 ?? '—')}</code></div>
          <div>Canonical: <code>${escapeHtml(row.code.canonical ?? '—')}</code></div>
          <div>Lang: <code>${escapeHtml(row.code.htmlLang ?? '—')}</code></div>
        </div>`
      : '<span class="muted-note">—</span>';

    const crawlHtml = row.crawl
      ? `<div class="mono-cell">
          <div>HTTP: <strong>${row.statusCode ?? 0}</strong> (${row.responseTimeMs ?? 0} ms, hops: ${row.redirectHops})</div>
          <div>Title: <code>${escapeHtml(row.crawl.title ?? '—')}</code></div>
          <div>H1: <code>${escapeHtml(row.crawl.h1 ?? '—')}</code></div>
          <div>Canonical: <code>${escapeHtml(row.crawl.canonical ?? '—')}</code></div>
        </div>`
      : '<span class="muted-note">—</span>';

    const divHtml =
      row.divergences.length === 0
        ? renderBadge({ label: dict.statusConsistent, variant: 'low' })
        : `<ul class="divergence-list">
            ${row.divergences
              .map(
                (d) =>
                  `<li>${renderBadge({ label: d.field, variant: d.severity })} <code>${escapeHtml(d.codeValue ?? 'null')}</code> != <code>${escapeHtml(d.crawlValue ?? 'null')}</code></li>`,
              )
              .join('')}
          </ul>`;

    return `<tr>
      <td class="mono-cell">
        <code>${escapeHtml(row.routePattern)}</code>
        <div class="cell-subtext">${escapeHtml(row.filePath ?? row.crawledUrl ?? '')}</div>
      </td>
      <td>${codeHtml}</td>
      <td>${crawlHtml}</td>
      <td>${divHtml}</td>
    </tr>`;
  });

  const tableHtml = renderDataTable({
    id: 'table-code-vs-crawl',
    caption: dict.comparatorTitle,
    headers: [
      dict.colRoute,
      dict.colCodeValues,
      dict.colCrawlValues,
      dict.colDivergences,
    ],
    rowsHtml,
    emptyMessage: dict.noCrawlYet,
  });

  return renderCard({
    id: 'feature-crawl-comparator',
    title: dict.comparatorTitle,
    childrenHtml: `${crawlTriggerFormHtml}${tableHtml}`,
  });
}
