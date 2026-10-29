import type { SupportedLanguage } from '@seo-partner/core';
import { escapeHtml } from '../ui/index.js';

export function renderAgentChatFeature(lang: SupportedLanguage): string {
  const isFr = lang === 'fr';

  const heading = isFr ? 'Agent Autonome ReAct - Chat' : 'Autonomous ReAct Agent - Chat';
  const subtitle = isFr
    ? 'Interagissez en langage naturel avec l\'agent déterministe. Les pensées et outils sont diffusés en direct via SSE.'
    : 'Interact in natural language with the deterministic agent. Thoughts and tools are streamed live via SSE.';
  const placeholder = isFr
    ? 'Ex: Analyse les blocages d\'indexation sur les routes dynamiques et propose un patch...'
    : 'E.g., Analyze indexing blockers on dynamic routes and propose a patch...';
  const btnRun = isFr ? 'Lancer l\'Agent' : 'Run Agent';
  const btnRunning = isFr ? 'Exécution en cours...' : 'Running...';
  const liveTitle = isFr ? 'Fil d\'exécution en direct (SSE)' : 'Live Execution Stream (SSE)';
  const tokenCostLabel = isFr ? 'Coût estimé : ' : 'Estimated Cost: ';

  return `
<section id="panel-chat" class="ui-tabpanel is-hidden" role="tabpanel" aria-labelledby="tab-btn-chat">
  <div class="panel-header">
    <h2 class="panel-title">${escapeHtml(heading)}</h2>
    <p class="panel-subtitle">${escapeHtml(subtitle)}</p>
  </div>

  <div class="chat-container">
    <div class="chat-input-bar">
      <div class="ui-field ui-field-grow">
        <label for="agent-chat-goal" class="ui-label">Instruction / Objectif</label>
        <textarea
          id="agent-chat-goal"
          class="ui-textarea"
          rows="2"
          placeholder="${escapeHtml(placeholder)}"
          aria-label="Instruction de l'agent"
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
      <span id="agent-status-badge" class="badge-status-idle">En attente</span>
    </div>

    <div class="chat-stream-box" role="log" aria-live="polite" id="chat-stream-log">
      <div class="chat-empty-state">
        <p class="muted-note">Aucune session active. Saisissez un objectif pour démarrer la boucle ReAct.</p>
      </div>
    </div>
  </div>

  <!-- Modal de confirmation explicite pour application de patch (Principe II) -->
  <div id="apply-patch-modal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="modal-patch-title">
    <div class="modal-card">
      <div class="modal-header">
        <h3 id="modal-patch-title" class="modal-title">Confirmation d'Application du Patch</h3>
        <button id="btn-modal-close" class="modal-close-btn" type="button" aria-label="Fermer">&times;</button>
      </div>
      <div class="modal-body">
        <p id="modal-patch-desc" class="modal-desc">
          Attention : cette action va modifier le code source sur le disque conformément à la proposition ci-dessous.
        </p>
        <div id="modal-patch-diff-preview" class="diff-viewer-modal">
          <pre class="diff-code"><code></code></pre>
        </div>
      </div>
      <div class="modal-footer">
        <button id="btn-modal-cancel" class="ui-btn ui-btn-secondary" type="button">Annuler</button>
        <button id="btn-modal-confirm-apply" class="ui-btn ui-btn-primary" type="button">Appliquer le correctif</button>
      </div>
    </div>
  </div>
</section>
`;
}

