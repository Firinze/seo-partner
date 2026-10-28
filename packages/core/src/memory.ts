import fs from 'node:fs';
import path from 'node:path';
import { getSeoDirPath } from './config.js';
import type { DecisionRecord } from './types.js';

export function getDecisionsFilePath(projectRoot: string): string {
  return path.join(getSeoDirPath(projectRoot), 'decisions.md');
}

export function initDecisionsFile(projectRoot: string, dryRun = false): string {
  const filePath = getDecisionsFilePath(projectRoot);
  if (!fs.existsSync(filePath) && !dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const initialContent = [
      '# SEO Decisions Log (.seo/decisions.md)',
      '',
      'Ce fichier consigne les décisions stratégiques et techniques SEO du projet.',
      '',
    ].join('\n');
    fs.writeFileSync(filePath, initialContent, 'utf-8');
  }
  return filePath;
}

export function appendDecisionToFile(
  projectRoot: string,
  decision: DecisionRecord,
): string {
  const filePath = initDecisionsFile(projectRoot, false);
  const findingLine = decision.findingId ? `- **Finding ID**: \`${decision.findingId}\`\n` : '';
  const entryMarkdown = [
    `## [${decision.date}] ${decision.title}`,
    findingLine ? findingLine.trimEnd() : null,
    `- **Rationale**: ${decision.rationale}`,
    '',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  fs.appendFileSync(filePath, `\n${entryMarkdown}\n`, 'utf-8');
  return filePath;
}

export function readDecisionsFromFile(projectRoot: string): ReadonlyArray<DecisionRecord> {
  const filePath = getDecisionsFilePath(projectRoot);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const records: DecisionRecord[] = [];
  const blocks = content.split(/^## \[/m).slice(1);
  for (const block of blocks) {
    const headerMatch = /^([^\]]+)\]\s+(.+)$/m.exec(block);
    if (!headerMatch) continue;
    const date = (headerMatch[1] ?? '').trim();
    const title = (headerMatch[2] ?? '').trim();
    const findingMatch = /- \*\*Finding ID\*\*:\s*`([^`]+)`/m.exec(block);
    const rationaleMatch = /- \*\*Rationale\*\*:\s*(.+)$/m.exec(block);
    records.push({
      date,
      title,
      rationale: (rationaleMatch?.[1] ?? '').trim(),
      findingId: findingMatch?.[1] ?? null,
    });
  }
  return records;
}

