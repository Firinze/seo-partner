import path from 'node:path';
import { SeoDatabase, AgentRepository } from '@seo-partner/store';
import { getPatchBatch, applyPatchBatch } from '@seo-partner/tools';

export interface ApplyAgentPatchOptions {
  readonly projectRoot: string;
  readonly sessionId: string;
  readonly patchBatchId: string;
  readonly force?: boolean;
}

export interface ApplyAgentPatchResult {
  readonly sessionId: string;
  readonly patchBatchId: string;
  readonly appliedFiles: ReadonlyArray<string>;
  readonly appliedAt: string;
  readonly backupDir?: string;
  readonly todoMarkersRemaining: number;
}

export async function applyAgentPatch(options: ApplyAgentPatchOptions): Promise<ApplyAgentPatchResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const batch = getPatchBatch(projectRoot, options.patchBatchId);
  if (!batch) {
    throw new Error(`Patch batch '${options.patchBatchId}' not found.`);
  }

  const appliedBatch = await applyPatchBatch(projectRoot, batch, { force: options.force });

  // Update session record in SQLite
  const store = SeoDatabase.open(projectRoot);
  try {
    const agentRepo = new AgentRepository(store);
    const session = agentRepo.getSession(options.sessionId);
    if (session) {
      agentRepo.updateSession({
        id: session.id,
        iterationsCompleted: session.iterationsCompleted,
        status: session.status,
        completedAt: session.completedAt,
        patchesGenerated: session.patchesGenerated,
        patchesApplied: session.patchesApplied + 1,
      });
    }
  } catch {
    // Non-fatal if session update fails
  } finally {
    store.close();
  }

  return {
    sessionId: options.sessionId,
    patchBatchId: options.patchBatchId,
    appliedFiles: appliedBatch.proposals.map((p) => p.filePath),
    appliedAt: appliedBatch.appliedAt ?? new Date().toISOString(),
    backupDir: appliedBatch.backupDir ?? undefined,
    todoMarkersRemaining: appliedBatch.todoMarkersRemaining ?? 0,
  };
}
