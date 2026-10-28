import type { Finding, SupportedLanguage } from '@seo-partner/core';
import { getDashboardDictionary } from '../../lib/i18n.js';
import {
  escapeHtml,
  renderBadge,
  renderCard,
  renderDataTable,
  renderSelectFilter,
} from '../ui/index.js';

export function renderFindingsFeature(
  findings: ReadonlyArray<Finding>,
  lang: SupportedLanguage,
  activeFilters?: {
    readonly category?: string;
    readonly severity?: string;
    readonly blockersOnly?: boolean;
  },
): string {
  const dict = getDashboardDictionary(lang);
  const isFr = lang === 'fr';

  const filtersHtml = `<div id="findings-filters" class="filter-bar">
    ${renderSelectFilter({
      id: 'filter-finding-category',
      label: dict.colRule,
      selectedValue: activeFilters?.category ?? '',
      options: [
        { value: '', label: dict.filterAllCategories },
        { value: 'technical', label: 'Technical (14)' },
        { value: 'on-page', label: 'On-Page (14)' },
        { value: 'schema', label: 'Schema.org (5)' },
        { value: 'local', label: 'Local SEO (4)' },
        { value: 'geo', label: 'GEO / Intl (3)' },
      ],
    })}
    ${renderSelectFilter({
      id: 'filter-finding-severity',
      label: dict.colSeverity,
      selectedValue: activeFilters?.severity ?? '',
      options: [
        { value: '', label: dict.filterAllSeverities },
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    })}
    <div class="checkbox-field">
      <input id="filter-finding-blockers" type="checkbox"${activeFilters?.blockersOnly ? ' checked' : ''} class="ui-checkbox" />
      <label for="filter-finding-blockers" class="ui-label ui-label-danger">${escapeHtml(dict.filterBlockersOnly)}</label>
    </div>
  </div>`;

  const rowsHtml = findings.map((f) => {
    const blockerHtml = f.blocksIndexing
      ? ` ${renderBadge({ label: dict.blockerBadge, variant: 'blocker' })}`
      : '';
    const evidenceLoc = f.evidence.url
      ? `${f.evidence.url} (HTTP ${f.evidence.statusCode ?? 200})`
      : `${f.evidence.filePath}:${f.evidence.lineNumber}`;
    const remText = isFr ? f.remediation.fr : f.remediation.en;

    return `<tr data-category="${escapeHtml(f.category)}" data-severity="${escapeHtml(f.severity)}" data-blocker="${f.blocksIndexing ? 'true' : 'false'}">
      <td class="mono-cell"><code>${escapeHtml(f.ruleId)}</code>${blockerHtml}</td>
      <td>${renderBadge({ label: f.severity, variant: f.severity })}</td>
      <td class="mono-cell"><code>${escapeHtml(f.subjectRef)}</code></td>
      <td class="mono-cell">
        <div><code>${escapeHtml(evidenceLoc)}</code></div>
        <div class="cell-subtext">Obs: ${escapeHtml(f.evidence.observed)}</div>
        <div class="cell-subtext">Exp: ${escapeHtml(f.evidence.expected)}</div>
      </td>
      <td>
        <div>${escapeHtml(remText)}</div>
        <div class="cell-subtext"><a href="${escapeHtml(f.officialSourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(f.officialSourceUrl)}</a></div>
      </td>
    </tr>`;
  });

  const tableHtml = renderDataTable({
    id: 'table-findings-list',
    caption: dict.tabFindings,
    headers: [
      dict.colRule,
      dict.colSeverity,
      dict.colSubject,
      dict.colEvidence,
      dict.colRemediation,
    ],
    rowsHtml,
    emptyMessage: dict.emptyStateMessage,
  });

  return renderCard({
    id: 'feature-findings',
    title: dict.tabFindings,
    childrenHtml: `${filtersHtml}${tableHtml}`,
  });
}
