import type { PrioritizedAction, SupportedLanguage } from '@seo-partner/core';
import { getDashboardDictionary } from '../../lib/i18n.js';
import {
  escapeHtml,
  renderBadge,
  renderCard,
  renderDataTable,
  renderSelectFilter,
} from '../ui/index.js';

export function renderBacklogFeature(
  actions: ReadonlyArray<PrioritizedAction>,
  lang: SupportedLanguage,
  activeFilters?: {
    readonly ownerRole?: string;
    readonly targetTimeframe?: string;
  },
): string {
  const dict = getDashboardDictionary(lang);
  const isFr = lang === 'fr';

  const filtersHtml = `<div id="backlog-filters" class="filter-bar">
    ${renderSelectFilter({
      id: 'filter-backlog-role',
      label: dict.colOwner,
      selectedValue: activeFilters?.ownerRole ?? '',
      options: [
        { value: '', label: dict.filterAllRoles },
        { value: 'dev', label: 'dev' },
        { value: 'content', label: 'content' },
        { value: 'outreach', label: 'outreach' },
      ],
    })}
    ${renderSelectFilter({
      id: 'filter-backlog-timeframe',
      label: dict.colTimeframe,
      selectedValue: activeFilters?.targetTimeframe ?? '',
      options: [
        { value: '', label: dict.filterAllTimeframes },
        { value: 'immediate', label: 'immediate' },
        { value: '30-days', label: '30-days' },
        { value: '90-days', label: '90-days' },
      ],
    })}
  </div>`;

  const rowsHtml = actions.map((action) => {
    const remText = isFr ? action.remediation.fr : action.remediation.en;
    const kpiText = isFr ? action.kpi.fr : action.kpi.en;
    const blockerBadge = action.blocksIndexing
      ? ` ${renderBadge({ label: dict.blockerBadge, variant: 'blocker' })}`
      : '';

    return `<tr data-owner="${escapeHtml(action.ownerRole)}" data-timeframe="${escapeHtml(action.targetTimeframe)}">
      <td>
        <div class="mono-cell"><code>${escapeHtml(action.ruleId)}</code> — <code>${escapeHtml(action.subjectRef)}</code>${blockerBadge}</div>
        <div class="cell-subtext">${escapeHtml(remText)}</div>
      </td>
      <td class="mono-cell">
        <strong class="ice-score-val">${action.ice.score.toFixed(2)}</strong>
        <div class="cell-subtext">I:${action.ice.impact} / C:${action.ice.confidence} / E:${action.ice.effort}</div>
      </td>
      <td class="mono-cell"><code>${escapeHtml(action.ownerRole)}</code></td>
      <td class="mono-cell"><code>${escapeHtml(action.targetTimeframe)}</code></td>
      <td>${escapeHtml(kpiText)}</td>
    </tr>`;
  });

  const tableHtml = renderDataTable({
    id: 'table-ice-backlog',
    caption: dict.tabBacklog,
    headers: [
      dict.colRemediation,
      dict.colIceScore,
      dict.colOwner,
      dict.colTimeframe,
      dict.colKpi,
    ],
    rowsHtml,
    emptyMessage: dict.emptyStateMessage,
  });

  return renderCard({
    id: 'feature-backlog',
    title: dict.tabBacklog,
    childrenHtml: `${filtersHtml}${tableHtml}`,
  });
}
