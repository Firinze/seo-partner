import type { PatchBatchResult, SupportedLanguage } from '@seo-partner/core';
import { getDashboardDictionary } from '../../lib/i18n.js';
import {
  escapeHtml,
  renderButton,
  renderCard,
  renderDataTable,
} from '../ui/index.js';

export interface RenderPatchesFeatureOptions {
  readonly lang: SupportedLanguage;
  readonly patches?: ReadonlyArray<PatchBatchResult>;
  readonly csrfToken?: string;
}

function renderDiffLine(line: string): string {
  const escaped = escapeHtml(line);
  if (line.startsWith('+') && !line.startsWith('+++')) {
    return `<span class="diff-line diff-add">${escaped}</span>`;
  }
  if (line.startsWith('-') && !line.startsWith('---')) {
    return `<span class="diff-line diff-del">${escaped}</span>`;
  }
  if (line.startsWith('@@')) {
    return `<span class="diff-line diff-hunk">${escaped}</span>`;
  }
  return `<span class="diff-line diff-ctx">${escaped}</span>`;
}

export function renderPatchesFeature(options: RenderPatchesFeatureOptions): string {
  const { lang, patches = [] } = options;
  const dict = getDashboardDictionary(lang);

  const actionsHtml = `<div class="sub-panel patch-actions-bar">
    ${renderButton({
      id: 'btn-propose-patches',
      label: dict.patchesProposeButton,
      type: 'button',
      variant: 'primary',
    })}
    <div id="patches-action-status" class="cell-subtext" role="status" aria-live="polite"></div>
  </div>`;

  if (patches.length === 0) {
    const emptyCard = renderCard({
      id: 'card-patches-overview',
      title: dict.patchesTitle,
      childrenHtml: `${actionsHtml}<div class="empty-state"><p>${escapeHtml(dict.patchesNoBatches)}</p></div>`,
    });
    return `<div id="feature-patches">${emptyCard}</div>`;
  }

  const batchRowsHtml = patches.map((batch) => {
    const dateFormatted = new Date(batch.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');
    const appliedLabel = batch.applied ? (lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'fr' ? 'Non (Dry-Run)' : 'No (Dry-Run)');
    const backupText = batch.backupDir ? escapeHtml(batch.backupDir) : '—';

    return `<tr>
      <td class="mono-cell"><strong>${escapeHtml(batch.batchId)}</strong></td>
      <td>${escapeHtml(dateFormatted)}</td>
      <td class="numeric-cell">${batch.proposals.length}</td>
      <td class="numeric-cell">${batch.skipped.length}</td>
      <td><span class="badge ${batch.applied ? 'badge-success' : 'badge-neutral'}">${escapeHtml(appliedLabel)}</span></td>
      <td class="numeric-cell">${batch.todoMarkersRemaining}</td>
      <td class="mono-cell cell-subtext">${backupText}</td>
    </tr>`;
  });

  const batchesTableHtml = renderDataTable({
    id: 'table-patches-batches',
    caption: dict.patchesTitle,
    headers: [
      dict.patchesBatchId,
      dict.patchesTimestamp,
      dict.patchesProposals,
      dict.patchesSkipped,
      dict.patchesApplied,
      dict.patchesTodoSeoCount,
      dict.patchesBackupLabel,
    ],
    rowsHtml: batchRowsHtml,
    emptyMessage: dict.emptyStateMessage,
  });

  const diffInspectionHtml = patches.map((batch) => {
    const proposalsHtml = batch.proposals.map((p) => {
      const formattedDiffLines = p.diff.split('\n').map(renderDiffLine).join('\n');
      return `<div class="patch-proposal-card">
        <div class="patch-proposal-meta">
          <strong>${escapeHtml(p.filePath)}</strong>
          <span class="badge badge-neutral">${escapeHtml(p.ruleId)}</span>
          <span class="cell-subtext">${p.hunks.length} hunk(s)</span>
        </div>
        <pre class="patch-diff-pre"><code>${formattedDiffLines}</code></pre>
      </div>`;
    }).join('');

    const skippedHtml = batch.skipped.length > 0 ? `<div class="patch-skipped-list">
      <h4>${escapeHtml(dict.patchesSkipped)} (${batch.skipped.length})</h4>
      <ul>
        ${batch.skipped.map((s) => `<li><strong>${escapeHtml(s.ruleId)}</strong> (${escapeHtml(s.reason)}): ${escapeHtml(s.message)}</li>`).join('')}
      </ul>
    </div>` : '';

    return `<details class="patch-batch-details" ${batch === patches[0] ? 'open' : ''}>
      <summary class="patch-batch-summary">
        <strong>${escapeHtml(batch.batchId)}</strong> — ${batch.proposals.length} ${escapeHtml(dict.patchesProposals.toLowerCase())}, ${batch.todoMarkersRemaining} ${escapeHtml(dict.patchesTodoSeoCount.toLowerCase())}
      </summary>
      <div class="patch-batch-body">
        ${proposalsHtml}
        ${skippedHtml}
      </div>
    </details>`;
  }).join('');

  const cardHtml = renderCard({
    id: 'card-patches-overview',
    title: dict.patchesTitle,
    childrenHtml: `${actionsHtml}${batchesTableHtml}<div class="patch-diffs-container">${diffInspectionHtml}</div>`,
  });

  return `<div id="feature-patches">${cardHtml}</div>`;
}
