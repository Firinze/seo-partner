import type { SupportedLanguage } from '@seo-partner/core';
import { escapeHtml } from '../ui/index.js';

export function renderAgentChatFeature(lang: SupportedLanguage): string {
  const isFr = lang === 'fr';

  const heading = isFr ? 'Assistant SEO IA' : 'Autonomous SEO AI Assistant';
  const subtitle = isFr
    ? 'Posez vos questions SEO ou demandez à l’assistant d’analyser vos pages et de proposer un correctif sur mesure.'
    : 'Ask SEO questions or instruct the assistant to audit pages and suggest targeted patches.';
  const placeholder = isFr
    ? 'Ex : Analyse pourquoi ma page d’accueil manque d’une balise canonical et propose un correctif...'
    : 'E.g., Analyze why my homepage is missing a canonical tag and suggest a patch...';
  const btnRun = isFr ? 'Envoyer la demande' : 'Send Request';
  const tokenCostLabel = isFr ? 'Consommation : ' : 'Usage: ';
  const statusReady = isFr ? 'Prêt' : 'Ready';
  const emptyStateText = isFr
    ? 'Posez une question ou donnez une consigne ci-dessus pour démarrer l’assistance.'
    : 'Enter an instruction above to start the assistant.';
  const modalTitle = isFr ? 'Validation de modification du code' : 'Code Modification Confirmation';
  const modalDesc = isFr
    ? 'Attention : cette action va modifier le code source sur le disque conformément à la proposition ci-dessous. Un fichier de sauvegarde (.bak) est automatiquement conservé.'
    : 'Warning: this action will modify the source code on disk according to the proposal below. An automatic backup (.bak) is retained.';
  const modalCancel = isFr ? 'Annuler sans modifier' : 'Cancel';
  const modalConfirm = isFr ? 'Appliquer la modification maintenant' : 'Apply Patch Now';

  return `
<div class="chat-feature-wrapper">
  <div class="panel-header">
    <h2 class="panel-title">${escapeHtml(heading)}</h2>
    <p class="panel-subtitle">${escapeHtml(subtitle)}</p>
  </div>

  <div class="chat-container">
    <div class="chat-input-bar">
      <div class="ui-field ui-field-grow">
        <label for="agent-chat-goal" class="ui-label">${isFr ? 'Instruction / Question SEO' : 'SEO Instruction / Question'}</label>
        <textarea
          id="agent-chat-goal"
          class="ui-textarea"
          rows="2"
          placeholder="${escapeHtml(placeholder)}"
          aria-label="${isFr ? 'Instruction pour l’assistant SEO' : 'Assistant instruction'}"
        ></textarea>
      </div>
      <div class="chat-actions">
        <button id="btn-agent-run" class="ui-btn ui-btn-primary" type="button">
          ${escapeHtml(btnRun)}
        </button>
      </div>
    </div>

    <div class="chat-meta-bar">
      <span id="agent-cost-indicator" class="mono-badge">
        ${escapeHtml(tokenCostLabel)}<strong id="agent-cost-val">$0.000</strong>
      </span>
      <span id="agent-status-badge" class="badge-status-idle">${escapeHtml(statusReady)}</span>
    </div>

    <div class="chat-stream-box" role="log" aria-live="polite" id="chat-stream-log">
      <div class="chat-empty-state">
        <p class="muted-note">${escapeHtml(emptyStateText)}</p>
      </div>
    </div>
  </div>

  <!-- Modal de confirmation explicite pour application de patch (Principe II) -->
  <div id="apply-patch-modal" class="modal-backdrop is-hidden" hidden role="dialog" aria-modal="true" aria-labelledby="modal-patch-title">
    <div class="modal-card">
      <div class="modal-header">
        <h3 id="modal-patch-title" class="modal-title">${escapeHtml(modalTitle)}</h3>
        <button id="btn-modal-close" class="modal-close-btn" type="button" aria-label="${isFr ? 'Fermer' : 'Close'}">&times;</button>
      </div>
      <div class="modal-body">
        <p id="modal-patch-desc" class="modal-desc">
          ${escapeHtml(modalDesc)}
        </p>
        <div id="modal-patch-diff-preview" class="diff-viewer-modal">
          <pre class="diff-code"><code></code></pre>
        </div>
      </div>
      <div class="modal-footer">
        <button id="btn-modal-cancel" class="ui-btn ui-btn-secondary" type="button">${escapeHtml(modalCancel)}</button>
        <button id="btn-modal-confirm-apply" class="ui-btn ui-btn-primary" type="button">${escapeHtml(modalConfirm)}</button>
      </div>
    </div>
  </div>
</div>
`;
}
