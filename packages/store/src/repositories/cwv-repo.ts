import type { CwvMetricRecord, CwvRating } from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class CwvRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public saveMetrics(records: ReadonlyArray<CwvMetricRecord>): void {
    if (records.length === 0) return;

    this.store.runInTransaction(() => {
      const stmt = this.store.db.prepare(`
        INSERT OR REPLACE INTO cwv_metrics (
          id, project_id, url, form_factor, scope,
          lcp_ms, lcp_rating, inp_ms, inp_rating,
          cls_score, cls_rating, fcp_ms, fcp_rating,
          ttfb_ms, ttfb_rating, fetched_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const r of records) {
        stmt.run(
          r.id,
          r.projectId,
          r.url,
          r.formFactor,
          r.scope,
          r.lcpMs,
          r.lcpRating,
          r.inpMs,
          r.inpRating,
          r.clsScore,
          r.clsRating,
          r.fcpMs,
          r.fcpRating,
          r.ttfbMs,
          r.ttfbRating,
          r.fetchedAt,
          r.expiresAt,
        );
      }
    });
  }

  public getMetricsForUrl(
    projectId: string,
    url: string,
    formFactor: 'PHONE' | 'DESKTOP' = 'PHONE',
  ): CwvMetricRecord | null {
    const row = this.store.db
      .prepare(`
        SELECT * FROM cwv_metrics
        WHERE project_id = ? AND url = ? AND form_factor = ?
        ORDER BY fetched_at DESC
        LIMIT 1
      `)
      .get(projectId, url, formFactor) as Record<string, unknown> | undefined;

    return row ? this.mapMetricRow(row) : null;
  }

  public isFresh(
    projectId: string,
    url: string,
    formFactor: 'PHONE' | 'DESKTOP' = 'PHONE',
  ): boolean {
    const row = this.store.db
      .prepare(`
        SELECT expires_at FROM cwv_metrics
        WHERE project_id = ? AND url = ? AND form_factor = ?
        ORDER BY fetched_at DESC
        LIMIT 1
      `)
      .get(projectId, url, formFactor) as { expires_at?: string } | undefined;

    if (!row?.expires_at) return false;
    return new Date(row.expires_at).getTime() > Date.now();
  }

  public listAllMetrics(projectId: string): ReadonlyArray<CwvMetricRecord> {
    const rows = this.store.db
      .prepare(`
        SELECT * FROM cwv_metrics
        WHERE project_id = ?
        ORDER BY url ASC, form_factor ASC
      `)
      .all(projectId) as Array<Record<string, unknown>>;

    return rows.map(this.mapMetricRow);
  }

  private mapMetricRow(row: Record<string, unknown>): CwvMetricRecord {
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      url: String(row['url']),
      formFactor: (row['form_factor'] as CwvMetricRecord['formFactor']) ?? 'PHONE',
      scope: (row['scope'] as CwvMetricRecord['scope']) ?? 'url',
      lcpMs: row['lcp_ms'] !== null && row['lcp_ms'] !== undefined ? Number(row['lcp_ms']) : null,
      lcpRating: (row['lcp_rating'] as CwvRating) ?? null,
      inpMs: row['inp_ms'] !== null && row['inp_ms'] !== undefined ? Number(row['inp_ms']) : null,
      inpRating: (row['inp_rating'] as CwvRating) ?? null,
      clsScore: row['cls_score'] !== null && row['cls_score'] !== undefined ? Number(row['cls_score']) : null,
      clsRating: (row['cls_rating'] as CwvRating) ?? null,
      fcpMs: row['fcp_ms'] !== null && row['fcp_ms'] !== undefined ? Number(row['fcp_ms']) : null,
      fcpRating: (row['fcp_rating'] as CwvRating) ?? null,
      ttfbMs: row['ttfb_ms'] !== null && row['ttfb_ms'] !== undefined ? Number(row['ttfb_ms']) : null,
      ttfbRating: (row['ttfb_rating'] as CwvRating) ?? null,
      fetchedAt: String(row['fetched_at']),
      expiresAt: String(row['expires_at']),
    };
  }
}

