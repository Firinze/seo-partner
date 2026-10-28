import path from 'node:path';
import type { PatchBatchResult, SupportedLanguage } from '@seo-partner/core';
import {
  applyPatchBatch,
  ApplyRefusalError,
  proposePatches,
} from '@seo-partner/tools';

export interface PatchCommandOptions {
  readonly projectRoot: string;
  readonly findingId?: string;
  readonly ruleId?: string;
  readonly apply?: boolean;
  readonly force?: boolean;
  readonly lang?: SupportedLanguage;
}

export interface PatchCommandResult {
  readonly batch: PatchBatchResult;
  readonly outputText: string;
}

export async function runPatchCommand(
  options: PatchCommandOptions,
): Promise<PatchCommandResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const lang: SupportedLanguage = options.lang === 'fr' ? 'fr' : 'en';

  let batch = await proposePatches({
    projectRoot,
    findingId: options.findingId,
    ruleId: options.ruleId,
    lang,
  });

  if (options.apply) {
    batch = await applyPatchBatch(projectRoot, batch, { force: options.force });
  }

  const lines: string[] = [];

  if (batch.proposals.length > 0) {
    for (const prop of batch.proposals) {
      lines.push(`--- ${prop.filePath} (${prop.kind}) ---`);
      lines.push(prop.diff);
    }
  }

  if (batch.applied) {
    const summary =
      lang === 'fr'
        ? `Appliqué. Sauvegarde : ${batch.backupDir}. ${batch.todoMarkersRemaining} marqueur(s) TODO-SEO à compléter.`
        : `Applied. Backup: ${batch.backupDir}. ${batch.todoMarkersRemaining} TODO-SEO marker(s) remaining to review.`;
    lines.push(summary);
  } else {
    const summary =
      lang === 'fr'
        ? `Lot ${batch.batchId} : ${batch.proposals.length} correctif(s), ${batch.skipped.length} ignoré(s), ${batch.todoMarkersRemaining} marqueur(s) TODO-SEO. Aucun fichier modifié.`
        : `Batch ${batch.batchId}: ${batch.proposals.length} patch(es), ${batch.skipped.length} skipped, ${batch.todoMarkersRemaining} TODO-SEO marker(s). Zero files modified.`;
    lines.push(summary);
  }

  return {
    batch,
    outputText: lines.join('\n'),
  };
}

export { ApplyRefusalError };

