import type { AstPatchProposal, SupportedLanguage } from '@seo-partner/core';
import { escapeHtml, renderButton, renderCard } from '../ui/index.js';
import { renderDiffViewer } from './DiffViewer.js';

export interface ProposalActionCardOptions {
  proposal: AstPatchProposal;
  lang?: SupportedLanguage;
}

export function renderProposalActionCard(options: ProposalActionCardOptions): string {
  const { proposal, lang = 'fr' } = options;

  const copyPromptLabel = lang === 'fr'
    ? "Copier le prompt pour l'Agent IDE"
    : 'Copy prompt for IDE Agent';

  const applyLabel = lang === 'fr'
    ? 'Appliquer le patch'
    : 'Apply patch';

  const appliedLabel = lang === 'fr' ? 'Appliqué' : 'Applied';

  const statusBadge = proposal.status === 'applied'
    ? `<span class="badge badge-success">${appliedLabel}</span>`
    : `<span class="badge badge-neutral">${escapeHtml(proposal.status)}</span>`;

  const diffHtml = renderDiffViewer(
    proposal.diffProposed || proposal.diffOriginal,
    proposal.targetFilePath,
  );

  const cardContent = `
    <div class="proposal-meta-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div>
        <span class="mono-cell" style="font-weight: bold;">${escapeHtml(proposal.targetFilePath)}</span>
        <span class="cell-subtext" style="margin-left: 8px;">(${escapeHtml(proposal.operationType)})</span>
      </div>
      <div>
        ${statusBadge}
      </div>
    </div>

    ${diffHtml}

    <div class="proposal-actions" style="display: flex; gap: 10px; margin-top: 14px;">
      ${renderButton({
        id: `btn-copy-prompt-${proposal.id}`,
        label: copyPromptLabel,
        type: 'button',
        variant: 'secondary',
        ariaLabel: copyPromptLabel,
      })}
      ${proposal.status !== 'applied'
        ? renderButton({
            id: `btn-apply-patch-${proposal.id}`,
            label: applyLabel,
            type: 'button',
            variant: 'primary',
            ariaLabel: applyLabel,
          })
        : ''}
    </div>

    <textarea id="prompt-text-${proposal.id}" style="display: none;" readonly>${escapeHtml(proposal.idePrompt)}</textarea>
  `;

  return renderCard({
    id: `card-proposal-${proposal.id}`,
    title: `Proposition ${proposal.id}`,
    childrenHtml: cardContent,
  });
}

