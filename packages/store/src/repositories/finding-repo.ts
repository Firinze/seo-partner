import type {
  Finding,
  FindingEvidence,
  FindingStatus,
  PrioritizedAction,
  RuleDefinition,
} from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class FindingRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public syncRulesCatalog(rules: ReadonlyArray<RuleDefinition>): void {
    const stmt = this.store.db.prepare(
      `INSERT INTO rule (id, category, severity, blocks_indexing, source_url, title_en, title_fr)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         category = excluded.category,
         severity = excluded.severity,
         blocks_indexing = excluded.blocks_indexing,
         source_url = excluded.source_url,
         title_en = excluded.title_en,
         title_fr = excluded.title_fr`,
    );

    for (const rule of rules) {
      stmt.run(
        rule.id,
        rule.category,
        rule.defaultSeverity,
        rule.blocksIndexing ? 1 : 0,
        rule.officialSourceUrl,
        rule.title.en,
        rule.title.fr,
      );
    }
  }

  public syncFindingsAndActions(newFindings: ReadonlyArray<Finding>): void {
    const now = new Date().toISOString();
    const existingRows = this.store.db
      .prepare('SELECT id, status, first_seen_at FROM finding')
      .all() as Array<{ id: string; status: FindingStatus; first_seen_at: string }>;

    const existingMap = new Map(existingRows.map((r) => [r.id, r]));
    const activeIds = new Set<string>();

    const upsertFindingStmt = this.store.db.prepare(
      `INSERT INTO finding (
        id, rule_id, category, severity, blocks_indexing, subject_ref,
        file_path, line_number, evidence_json, remediation_en, remediation_fr,
        owner_role, target_timeframe, kpi_en, kpi_fr, official_source_url,
        status, first_seen_at, last_seen_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        severity = excluded.severity,
        blocks_indexing = excluded.blocks_indexing,
        file_path = excluded.file_path,
        line_number = excluded.line_number,
        evidence_json = excluded.evidence_json,
        remediation_en = excluded.remediation_en,
        remediation_fr = excluded.remediation_fr,
        status = excluded.status,
        last_seen_at = excluded.last_seen_at,
        resolved_at = excluded.resolved_at`,
    );

    this.store.db.prepare('DELETE FROM action').run();

    const insertActionStmt = this.store.db.prepare(
      `INSERT INTO action (
        id, finding_id, blocks_indexing,
        ice_impact, ice_confidence, ice_effort, ice_score,
        rationale_en, rationale_fr, owner_role, target_timeframe,
        kpi_en, kpi_fr, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'todo')`,
    );

    for (const f of newFindings) {
      activeIds.add(f.id);
      const prev = existingMap.get(f.id);
      const status: FindingStatus =
        prev?.status === 'acknowledged' ? 'acknowledged' : 'open';
      const firstSeenAt = prev?.first_seen_at ?? f.firstSeenAt ?? now;

      upsertFindingStmt.run(
        f.id,
        f.ruleId,
        f.category,
        f.severity,
        f.blocksIndexing ? 1 : 0,
        f.subjectRef,
        f.evidence.filePath,
        Math.max(1, f.evidence.lineNumber),
        JSON.stringify(f.evidence),
        f.remediation.en,
        f.remediation.fr,
        f.ownerRole,
        f.targetTimeframe,
        f.kpi.en,
        f.kpi.fr,
        f.officialSourceUrl,
        status,
        firstSeenAt,
        now,
        null,
      );

      insertActionStmt.run(
        `act_${f.id}`,
        f.id,
        f.blocksIndexing ? 1 : 0,
        f.ice.impact,
        f.ice.confidence,
        f.ice.effort,
        f.ice.score,
        f.ice.rationale.en,
        f.ice.rationale.fr,
        f.ownerRole,
        f.targetTimeframe,
        f.kpi.en,
        f.kpi.fr,
      );
    }

    const resolveStmt = this.store.db.prepare(
      `UPDATE finding SET status = 'resolved', resolved_at = ? WHERE id = ?`,
    );

    for (const [oldId, oldRow] of existingMap.entries()) {
      if (!activeIds.has(oldId) && oldRow.status !== 'resolved') {
        resolveStmt.run(now, oldId);
      }
    }
  }

  public listFindings(options?: {
    includeResolved?: boolean;
    category?: string;
    severity?: string;
  }): ReadonlyArray<Finding> {
    const clauses: string[] = [];
    const params: Array<string | number> = [];

    if (!options?.includeResolved) {
      clauses.push("f.status != 'resolved'");
    }
    if (options?.category) {
      clauses.push('f.category = ?');
      params.push(options.category);
    }
    if (options?.severity) {
      clauses.push('f.severity = ?');
      params.push(options.severity);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.store.db
      .prepare(
        `SELECT f.*, a.ice_impact, a.ice_confidence, a.ice_effort, a.ice_score, a.rationale_en, a.rationale_fr
         FROM finding f
         LEFT JOIN action a ON a.finding_id = f.id
         ${whereSql}
         ORDER BY f.blocks_indexing DESC, COALESCE(a.ice_score, 0) DESC, f.id ASC`,
      )
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row['id']),
      ruleId: String(row['rule_id']),
      category: String(row['category']) as Finding['category'],
      severity: String(row['severity']) as Finding['severity'],
      blocksIndexing: Number(row['blocks_indexing']) === 1,
      subjectRef: String(row['subject_ref']),
      evidence: JSON.parse(String(row['evidence_json'])) as FindingEvidence,
      ice: {
        impact: Number(row['ice_impact'] ?? 5),
        confidence: Number(row['ice_confidence'] ?? 5),
        effort: Number(row['ice_effort'] ?? 5),
        score: Number(row['ice_score'] ?? 5),
        rationale: {
          en: String(row['rationale_en'] ?? ''),
          fr: String(row['rationale_fr'] ?? ''),
        },
      },
      remediation: {
        en: String(row['remediation_en']),
        fr: String(row['remediation_fr']),
      },
      ownerRole: String(row['owner_role']) as Finding['ownerRole'],
      targetTimeframe: String(row['target_timeframe']) as Finding['targetTimeframe'],
      kpi: {
        en: String(row['kpi_en']),
        fr: String(row['kpi_fr']),
      },
      officialSourceUrl: String(row['official_source_url']),
      status: String(row['status']) as FindingStatus,
      firstSeenAt: String(row['first_seen_at']),
      lastSeenAt: String(row['last_seen_at']),
      resolvedAt: row['resolved_at'] ? String(row['resolved_at']) : null,
    }));
  }

  public listPrioritizedActions(options?: {
    quickWinsOnly?: boolean;
  }): ReadonlyArray<PrioritizedAction> {
    const whereSql = options?.quickWinsOnly
      ? 'WHERE a.ice_score >= 7.0 AND a.ice_effort >= 8'
      : '';

    const rows = this.store.db
      .prepare(
        `SELECT a.*, f.rule_id, f.subject_ref, f.severity, f.evidence_json, f.remediation_en, f.remediation_fr
         FROM action a
         JOIN finding f ON f.id = a.finding_id
         ${whereSql}
         ORDER BY a.blocks_indexing DESC, a.ice_score DESC, a.ice_impact DESC, a.ice_effort DESC`,
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row['id']),
      findingId: String(row['finding_id']),
      ruleId: String(row['rule_id']),
      subjectRef: String(row['subject_ref']),
      severity: String(row['severity']) as PrioritizedAction['severity'],
      blocksIndexing: Number(row['blocks_indexing']) === 1,
      ice: {
        impact: Number(row['ice_impact']),
        confidence: Number(row['ice_confidence']),
        effort: Number(row['ice_effort']),
        score: Number(row['ice_score']),
        rationale: {
          en: String(row['rationale_en']),
          fr: String(row['rationale_fr']),
        },
      },
      remediation: {
        en: String(row['remediation_en']),
        fr: String(row['remediation_fr']),
      },
      ownerRole: String(row['owner_role']) as PrioritizedAction['ownerRole'],
      targetTimeframe: String(row['target_timeframe']) as PrioritizedAction['targetTimeframe'],
      kpi: {
        en: String(row['kpi_en']),
        fr: String(row['kpi_fr']),
      },
      status: String(row['status']) as PrioritizedAction['status'],
      evidence: JSON.parse(String(row['evidence_json'])) as FindingEvidence,
    }));
  }
}

