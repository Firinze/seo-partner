import type { DecisionRecord, SupportedLanguage } from '@seo-partner/core';
import { getDashboardDictionary } from '../../lib/i18n.js';
import {
  escapeHtml,
  renderButton,
  renderCard,
  renderDataTable,
  renderSelectFilter,
} from '../ui/index.js';

export function renderDecisionsReportsFeature(
  decisions: ReadonlyArray<DecisionRecord>,
  lang: SupportedLanguage,
): string {
  const dict = getDashboardDictionary(lang);

  const decisionFormHtml = `<form id="form-add-decision" class="sub-panel">
    <div class="form-grid-2">
      <div class="ui-field">
        <label for="input-decision-title" class="ui-label">${escapeHtml(dict.decisionTitleLabel)}</label>
        <input id="input-decision-title" type="text" required class="ui-input" />
      </div>
      <div class="ui-field">
        <label for="input-decision-rationale" class="ui-label">${escapeHtml(dict.decisionRationaleLabel)}</label>
        <input id="input-decision-rationale" type="text" required class="ui-input" />
      </div>
    </div>
    <div class="form-actions">
      ${renderButton({ id: 'btn-submit-decision', label: dict.decisionSubmitButton, type: 'submit' })}
    </div>
  </form>`;

  const decisionRowsHtml = decisions.map(
    (d) => `<tr>
      <td class="mono-cell">${escapeHtml(d.date)}</td>
      <td><strong>${escapeHtml(d.title)}</strong></td>
      <td>${escapeHtml(d.rationale)}</td>
    </tr>`,
  );

  const decisionsTableHtml = renderDataTable({
    id: 'table-decisions-log',
    caption: dict.decisionsTitle,
    headers: ['Date', dict.decisionTitleLabel, dict.decisionRationaleLabel],
    rowsHtml: decisionRowsHtml,
    emptyMessage: dict.emptyStateMessage,
  });

  const decisionsCardHtml = renderCard({
    id: 'card-decisions-log',
    title: dict.decisionsTitle,
    childrenHtml: `${decisionFormHtml}${decisionsTableHtml}`,
  });

  const reportsCardHtml = renderCard({
    id: 'card-reports-export',
    title: dict.reportsTitle,
    childrenHtml: `<form id="form-export-report" class="filter-bar">
      ${renderSelectFilter({
        id: 'select-report-format',
        label: dict.reportFormatLabel,
        selectedValue: 'html',
        options: [
          { value: 'html', label: 'HTML5 Autonome (.html)' },
          { value: 'md', label: 'Markdown (.md)' },
          { value: 'json', label: 'JSON (.json)' },
        ],
      })}
      ${renderButton({ id: 'btn-export-report', label: dict.reportExportButton, type: 'submit' })}
    </form>
    <div id="report-export-result" class="cell-subtext" role="status" aria-live="polite"></div>`,
  });

  return `<div id="feature-decisions-reports">${decisionsCardHtml}${reportsCardHtml}</div>`;
}
