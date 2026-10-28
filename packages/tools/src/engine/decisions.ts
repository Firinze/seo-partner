import path from 'node:path';
import {
  appendDecisionToFile,
  readDecisionsFromFile,
  type DecisionRecord,
} from '@seo-partner/core';
import { DecisionRepository, SeoDatabase } from '@seo-partner/store';

export interface RecordDecisionOptions {
  readonly projectRoot: string;
  readonly title: string;
  readonly rationale: string;
  readonly findingId?: string;
}

export function recordDecision(options: RecordDecisionOptions): DecisionRecord {
  const projectRoot = path.resolve(options.projectRoot);
  const title = options.title.trim();
  const rationale = options.rationale.trim();
  if (title.length < 2) {
    throw new Error('Decision title must contain at least 2 characters');
  }
  if (rationale.length < 2) {
    throw new Error('Decision rationale must contain at least 2 characters');
  }

  const record: DecisionRecord = {
    date: new Date().toISOString().slice(0, 10),
    title,
    rationale,
    findingId: options.findingId?.trim() || null,
  };

  appendDecisionToFile(projectRoot, record);

  const store = SeoDatabase.open(projectRoot);
  try {
    const repo = new DecisionRepository(store);
    return repo.addDecision(record);
  } finally {
    store.close();
  }
}

export function listDecisions(projectRoot: string): ReadonlyArray<DecisionRecord> {
  const resolved = path.resolve(projectRoot);
  const store = SeoDatabase.open(resolved);
  try {
    const repo = new DecisionRepository(store);
    const dbRecords = repo.listDecisions();
    if (dbRecords.length > 0) {
      return dbRecords;
    }
    return readDecisionsFromFile(resolved);
  } finally {
    store.close();
  }
}

