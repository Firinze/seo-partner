import type { DecisionRecord } from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class DecisionRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public addDecision(decision: DecisionRecord): DecisionRecord {
    const res = this.store.db
      .prepare(
        `INSERT INTO decision (date, title, rationale, finding_id)
         VALUES (?, ?, ?, ?)`,
      )
      .run(decision.date, decision.title, decision.rationale, decision.findingId);

    return {
      id: Number(res.lastInsertRowid),
      ...decision,
    };
  }

  public listDecisions(): ReadonlyArray<DecisionRecord> {
    const rows = this.store.db
      .prepare('SELECT * FROM decision ORDER BY id DESC')
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: Number(row['id']),
      date: String(row['date']),
      title: String(row['title']),
      rationale: String(row['rationale']),
      findingId: row['finding_id'] ? String(row['finding_id']) : null,
    }));
  }
}

