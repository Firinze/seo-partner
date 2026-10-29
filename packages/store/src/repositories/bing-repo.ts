import type {
  BingPerformanceRecord,
  BingInspectionRecord,
} from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class BingRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public savePerformanceRows(records: ReadonlyArray<BingPerformanceRecord>): void {
    if (records.length === 0) return;

    this.store.runInTransaction(() => {
      const stmt = this.store.db.prepare(`
        INSERT OR REPLACE INTO bing_performance (
          id, project_id, url, query, clicks, impressions, ctr, position,
          date_start, date_end, fetched_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const r of records) {
        stmt.run(
          r.id,
          r.projectId,
          r.url,
          r.query,
          r.clicks,
          r.impressions,
          r.ctr,
          r.position,
          r.dateStart,
          r.dateEnd,
          r.fetchedAt,
          r.expiresAt,
        );
      }
    });
  }

  public listPerformance(projectId: string, limit = 100): ReadonlyArray<BingPerformanceRecord> {
    const rows = this.store.db
      .prepare(`
        SELECT * FROM bing_performance
        WHERE project_id = ?
        ORDER BY clicks DESC, impressions DESC
        LIMIT ?
      `)
      .all(projectId, limit) as Array<Record<string, unknown>>;

    return rows.map(this.mapPerformanceRow);
  }

  public isPerformanceCached(projectId: string): boolean {
    const nowIso = new Date().toISOString();
    const row = this.store.db
      .prepare(`
        SELECT COUNT(*) as count FROM bing_performance
        WHERE project_id = ? AND expires_at > ?
      `)
      .get(projectId, nowIso) as { count?: number } | undefined;

    return (row?.count ?? 0) > 0;
  }

  public getCachedExpiresAt(projectId: string): string | null {
    const row = this.store.db
      .prepare(`
        SELECT MAX(expires_at) as max_expires FROM bing_performance
        WHERE project_id = ?
      `)
      .get(projectId) as { max_expires?: string | null } | undefined;

    return row?.max_expires ?? null;
  }

  public saveInspection(record: BingInspectionRecord): void {
    const stmt = this.store.db.prepare(`
      INSERT OR REPLACE INTO bing_inspection (
        id, project_id, url, verdict, indexing_state, crawl_state,
        last_crawl_time, http_code, fetched_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.projectId,
      record.url,
      record.verdict,
      record.indexingState,
      record.crawlState,
      record.lastCrawlTime ?? null,
      record.httpCode,
      record.fetchedAt,
      record.expiresAt,
    );
  }

  public getInspection(projectId: string, url: string): BingInspectionRecord | null {
    const row = this.store.db
      .prepare(`
        SELECT * FROM bing_inspection
        WHERE project_id = ? AND url = ?
      `)
      .get(projectId, url) as Record<string, unknown> | undefined;

    return row ? this.mapInspectionRow(row) : null;
  }

  private mapPerformanceRow(row: Record<string, unknown>): BingPerformanceRecord {
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      url: String(row.url),
      query: String(row.query ?? ''),
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0),
      dateStart: String(row.date_start),
      dateEnd: String(row.date_end),
      fetchedAt: String(row.fetched_at),
      expiresAt: String(row.expires_at),
    };
  }

  private mapInspectionRow(row: Record<string, unknown>): BingInspectionRecord {
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      url: String(row.url),
      verdict: String(row.verdict) as BingInspectionRecord['verdict'],
      indexingState: String(row.indexing_state),
      crawlState: String(row.crawl_state),
      lastCrawlTime: row.last_crawl_time ? String(row.last_crawl_time) : null,
      httpCode: Number(row.http_code ?? 0),
      fetchedAt: String(row.fetched_at),
      expiresAt: String(row.expires_at),
    };
  }
}

