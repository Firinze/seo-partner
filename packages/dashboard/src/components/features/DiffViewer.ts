import { escapeHtml } from '../ui/index.js';

export interface DiffLine {
  type: 'addition' | 'deletion' | 'hunk' | 'unchanged';
  content: string;
}

export function parseUnifiedDiffLines(diffText: string): DiffLine[] {
  const lines = diffText.split('\n');
  const result: DiffLine[] = [];

  for (const line of lines) {
    if (line.startsWith('---') || line.startsWith('+++')) {
      continue;
    }
    if (line.startsWith('+')) {
      result.push({ type: 'addition', content: line.slice(1) });
    } else if (line.startsWith('-')) {
      result.push({ type: 'deletion', content: line.slice(1) });
    } else if (line.startsWith('@@')) {
      result.push({ type: 'hunk', content: line });
    } else {
      result.push({
        type: 'unchanged',
        content: line.startsWith(' ') ? line.slice(1) : line,
      });
    }
  }

  return result;
}

export function renderDiffViewer(diffText: string, filePath?: string): string {
  const lines = parseUnifiedDiffLines(diffText);

  const linesHtml = lines
    .map((l) => {
      const cls =
        l.type === 'addition'
          ? 'diff-line diff-add'
          : l.type === 'deletion'
          ? 'diff-line diff-del'
          : l.type === 'hunk'
          ? 'diff-line diff-hunk'
          : 'diff-line diff-ctx';
      const prefix =
        l.type === 'addition' ? '+' : l.type === 'deletion' ? '-' : l.type === 'hunk' ? '@' : ' ';
      return `<div class="${cls}"><span class="diff-gutter mono-cell">${prefix}</span><span class="diff-content mono-cell">${escapeHtml(
        l.content,
      )}</span></div>`;
    })
    .join('\n');

  const header = filePath
    ? `<div class="diff-header mono-cell"><strong>${escapeHtml(filePath)}</strong></div>`
    : '';

  return `
    <div class="diff-viewer-container card">
      ${header}
      <div class="diff-code-body mono-cell">
        ${linesHtml}
      </div>
    </div>
  `;
}

