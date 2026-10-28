import path from 'node:path';
import type { PrioritizedAction } from '@seo-partner/core';
import { FindingRepository, SeoDatabase } from '@seo-partner/store';
import { runAuditCommand } from './audit.js';

export interface BacklogCommandOptions {
  readonly projectRoot: string;
  readonly quickWinsOnly?: boolean;
}

export interface BacklogCommandResult {
  readonly totalActions: number;
  readonly blockingIndexingCount: number;
  readonly quickWinsCount: number;
  readonly actions: ReadonlyArray<PrioritizedAction>;
}

export async function runBacklogCommand(
  options: BacklogCommandOptions,
): Promise<BacklogCommandResult> {
  const projectRoot = path.resolve(options.projectRoot);

  let store = SeoDatabase.open(projectRoot);
  let actions = new FindingRepository(store).listPrioritizedActions({
    quickWinsOnly: options.quickWinsOnly,
  });
  store.close();

  if (actions.length === 0) {
    await runAuditCommand({ projectRoot });
    store = SeoDatabase.open(projectRoot);
    actions = new FindingRepository(store).listPrioritizedActions({
      quickWinsOnly: options.quickWinsOnly,
    });
    store.close();
  }

  const blockingIndexingCount = actions.filter((a) => a.blocksIndexing).length;
  const quickWinsCount = actions.filter(
    (a) => a.ice.score >= 7.0 && a.ice.effort >= 8,
  ).length;

  return {
    totalActions: actions.length,
    blockingIndexingCount,
    quickWinsCount,
    actions,
  };
}

