import type { GscPerformanceRecord, GscInspectionRecord } from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class GscRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public savePerformanceRows(records: ReadonlyArray<GscPerformanceRecord>): void {
    if (records.length === 0) return;

    this.store.runInTransaction(() => {
      const stmt = this.store.db.prepare(`
        INSERT OR REPLACE INTO gsc_performance (
          id, project_id, url, query, device, country,
          clicks, impressions, ctr, position,
          date_start, date_end, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const r of records) {
        stmt.run(
          r.id,
          r.projectId,
          r.url,
          r.query,
          r.device,
          r.country,
          r.clicks,
          r.impressions,
          r.ctr,
          r.position,
          r.dateStart ?? null,
          r.dateEnd ?? null,
          r.fetchedAt ?? new Date().toISOString(),
        );
      }
    });
  }

  public getPerformanceByUrl(projectId: string, url: string): ReadonlyArray<GscPerformanceRecord> {
    const rows = this.store.db
      .prepare(`
        SELECT * FROM gsc_performance
        WHERE project_id = ? AND url = ?
        ORDER BY clicks DESC, impressions DESC
      `)
      .all(projectId, url) as Array<Record<string, unknown>>;

    return rows.map(this.mapPerformanceRow);
  }

  public listTopQueries(projectId: string, limit = 50): ReadonlyArray<GscPerformanceRecord> {
    const rows = this.store.db
      .prepare(`
        SELECT * FROM gsc_performance
        WHERE project_id = ? AND query != ''
        ORDER BY clicks DESC, impressions DESC
        LIMIT ?
      `)
      .all(projectId, limit) as Array<Record<string, unknown>>;

    return rows.map(this.mapPerformanceRow);
  }

  public saveInspectionRecord(record: GscInspectionRecord): void {
    this.store.db
      .prepare(`
        INSERT OR REPLACE INTO gsc_inspection (
          id, project_id, url, verdict, coverage_state,
          indexing_state, robots_txt_state, last_crawl_time,
          page_fetch_state, canonical_user, canonical_google, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        record.id,
        record.projectId,
        record.url,
        record.verdict,
        record.coverageState,
        record.indexingState,
        record.robotsTxtState,
        record.lastCrawlTime ?? null,
        record.pageFetchState ?? null,
        record.canonicalUser ?? null,
        record.canonicalGoogle ?? null,
        record.fetchedAt ?? new Date().toISOString(),
      );
  }

  public getInspectionRecord(projectId: string, url: string): GscInspectionRecord | null {
    const row = this.store.db
      .prepare(`
        SELECT * FROM gsc_inspection
        WHERE project_id = ? AND url = ?
        ORDER BY fetched_at DESC
        LIMIT 1
      `)
      .get(projectId, url) as Record<string, unknown> | undefined;

    return row ? this.mapInspectionRow(row) : null;
  }

  public listInspectionRecords(projectId: string): ReadonlyArray<GscInspectionRecord> {
    const rows = this.store.db
      .prepare(`
        SELECT * FROM gsc_inspection
        WHERE project_id = ?
        ORDER BY fetched_at DESC
      `)
      .all(projectId) as Array<Record<string, unknown>>;

    return rows.map(this.mapInspectionRow);
  }

  private mapPerformanceRow(row: Record<string, unknown>): GscPerformanceRecord {
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      url: String(row['url']),
      query: String(row['query'] ?? ''),
      device: (row['device'] as GscPerformanceRecord['device']) ?? 'all',
      country: String(row['country'] ?? 'all'),
      clicks: Number(row['clicks'] ?? 0),
      impressions: Number(row['impressions'] ?? 0),
      ctr: Number(row['ctr'] ?? 0),
      position: Number(row['position'] ?? 0),
      dateStart: String(row['date_start']),
      dateEnd: String(row['date_end']),
      fetchedAt: String(row['fetched_at']),
    };
  }

  private mapInspectionRow(row: Record<string, unknown>): GscInspectionRecord {
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      url: String(row['url']),
      verdict: (row['verdict'] as GscInspectionRecord['verdict']) ?? 'NEUTRAL',
      coverageState: String(row['coverage_state'] ?? ''),
      indexingState: String(row['indexing_state'] ?? ''),
      robotsTxtState: String(row['robots_txt_state'] ?? ''),
      lastCrawlTime: row['last_crawl_time'] ? String(row['last_crawl_time']) : null,
      pageFetchState: row['page_fetch_state'] ? String(row['page_fetch_state']) : null,
      canonicalUser: row['canonical_user'] ? String(row['canonical_user']) : null,
      canonicalGoogle: row['canonical_google'] ? String(row['canonical_google']) : null,
      fetchedAt: String(row['fetched_at']),
    };
  }
}

