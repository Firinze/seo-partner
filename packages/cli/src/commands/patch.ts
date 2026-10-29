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
        ? `Applique. Sauvegarde : ${batch.backupDir}.`
        : `Applied. Backup: ${batch.backupDir}.`;
    lines.push(summary);
  } else {
    const summary =
      lang === 'fr'
        ? `Lot ${batch.batchId} : ${batch.proposals.length} proposition(s) de correctif, ${batch.skipped.length} ignore(s). Aucun fichier modifie sur le disque.\nPour appliquer directement sur le disque : seo-partner patch --apply\nOu transmettez les propositions a votre Agent IDE.`
        : `Batch ${batch.batchId}: ${batch.proposals.length} patch proposal(s), ${batch.skipped.length} skipped. Zero files modified on disk.\nTo apply directly to disk: seo-partner patch --apply\nOr provide the proposals to your IDE Agent.`;
    lines.push(summary);
  }

  return {
    batch,
    outputText: lines.join('\n'),
  };
}

export { ApplyRefusalError };

