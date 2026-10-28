import path from 'node:path';
import {
  appendDecisionToFile,
  readDecisionsFromFile,
  type DecisionRecord,
} from '@seo-partner/core';
import { DecisionRepository, SeoDatabase } from '@seo-partner/store';

export interface MemoryAddOptions {
  readonly projectRoot: string;
  readonly title: string;
  readonly rationale: string;
  readonly findingId?: string;
}

export interface MemoryCommandResult {
  readonly action: 'list' | 'add';
  readonly decisions: ReadonlyArray<DecisionRecord>;
}

export function runMemoryAddCommand(options: MemoryAddOptions): MemoryCommandResult {
  const projectRoot = path.resolve(options.projectRoot);
  if (!options.title.trim()) {
    throw new Error('Decision --title is required');
  }
  if (!options.rationale.trim()) {
    throw new Error('Decision --rationale is required');
  }

  const record: DecisionRecord = {
    date: new Date().toISOString().slice(0, 10),
    title: options.title.trim(),
    rationale: options.rationale.trim(),
    findingId: options.findingId?.trim() || null,
  };

  appendDecisionToFile(projectRoot, record);

  const store = SeoDatabase.open(projectRoot);
  try {
    const repo = new DecisionRepository(store);
    const saved = repo.addDecision(record);
    return {
      action: 'add',
      decisions: [saved],
    };
  } finally {
    store.close();
  }
}

export function runMemoryListCommand(options: {
  projectRoot: string;
}): MemoryCommandResult {
  const projectRoot = path.resolve(options.projectRoot);
  const store = SeoDatabase.open(projectRoot);
  try {
    const repo = new DecisionRepository(store);
    const dbRecords = repo.listDecisions();
    if (dbRecords.length > 0) {
      return { action: 'list', decisions: dbRecords };
    }
    return {
      action: 'list',
      decisions: readDecisionsFromFile(projectRoot),
    };
  } finally {
    store.close();
  }
}

