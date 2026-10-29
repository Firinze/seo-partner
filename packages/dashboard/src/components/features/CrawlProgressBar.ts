import { escapeHtml } from '../ui/index.js';

export interface CrawlProgressBarOptions {
  visitedCount: number;
  totalDiscovered: number;
  estimatedRemainingMs?: number;
  currentUrl?: string;
}

export function renderCrawlProgressBar(options: CrawlProgressBarOptions): string {
  const { visitedCount, totalDiscovered, estimatedRemainingMs = 0, currentUrl = '' } = options;

  const percentage = totalDiscovered > 0
    ? Math.min(100, Math.round((visitedCount / totalDiscovered) * 100))
    : 0;

  const remainingSeconds = Math.round(estimatedRemainingMs / 1000);
  const remainingText = remainingSeconds > 0
    ? `~${remainingSeconds}s restant(s)`
    : '';

  return `
    <div id="crawl-progress-widget" class="card crawl-progress-container" style="padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 600;">Progression de l'exploration : ${visitedCount} / ${totalDiscovered} URLs</span>
        <span class="mono-cell cell-subtext">${percentage}% ${remainingText}</span>
      </div>
      <div class="progress-bar-track" style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
        <div id="crawl-progress-bar" style="width: ${percentage}%; height: 100%; background: #38bdf8; transition: width 0.3s ease;"></div>
      </div>
      ${currentUrl ? `<div class="mono-cell cell-subtext" style="margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">En cours : ${escapeHtml(currentUrl)}</div>` : ''}
    </div>
  `;
}

