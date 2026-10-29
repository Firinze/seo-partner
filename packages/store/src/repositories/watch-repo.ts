import type {
  WatchSourceRecord,
  WatchEntryRecord,
  WatchSourceKind,
} from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class WatchRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public upsertSource(source: WatchSourceRecord): void {
    const stmt = this.store.db.prepare(`
      INSERT OR REPLACE INTO watch_source (
        id, url, kind, last_checked_at, content_hash
      ) VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      source.id,
      source.url,
      source.kind,
      source.lastCheckedAt ?? null,
      source.contentHash ?? null,
    );
  }

  public getSource(id: string): WatchSourceRecord | null {
    const row = this.store.db
      .prepare('SELECT * FROM watch_source WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapSourceRow(row) : null;
  }

  public listSources(): ReadonlyArray<WatchSourceRecord> {
    const rows = this.store.db
      .prepare('SELECT * FROM watch_source ORDER BY id ASC')
      .all() as Array<Record<string, unknown>>;
    return rows.map(this.mapSourceRow);
  }

  public saveEntries(entries: ReadonlyArray<WatchEntryRecord>): void {
    if (entries.length === 0) return;

    this.store.runInTransaction(() => {
      const stmt = this.store.db.prepare(`
        INSERT OR REPLACE INTO watch_entry (
          id, source_id, title, summary, pub_date, official_url, confirmed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const e of entries) {
        stmt.run(
          e.id,
          e.sourceId,
          e.title,
          e.summary,
          e.pubDate,
          e.officialUrl,
          e.confirmed ? 1 : 0,
          e.createdAt ?? new Date().toISOString(),
        );
      }
    });
  }

  public listEntries(options?: {
    sourceId?: string;
    limit?: number;
  }): ReadonlyArray<WatchEntryRecord> {
    const limit = options?.limit ?? 100;
    let query = 'SELECT * FROM watch_entry';
    const params: Array<string | number> = [];

    if (options?.sourceId) {
      query += ' WHERE source_id = ?';
      params.push(options.sourceId);
    }

    query += ' ORDER BY pub_date DESC, created_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.store.db.prepare(query).all(...params) as Array<Record<string, unknown>>;
    return rows.map(this.mapEntryRow);
  }

  public getLatestSyncDate(): string | null {
    const row = this.store.db
      .prepare('SELECT MAX(last_checked_at) AS latest_sync FROM watch_source')
      .get() as { latest_sync?: string | null } | undefined;
    return row?.latest_sync ?? null;
  }

  public isFresh(maxAgeDays = 90): boolean {
    const latestSync = this.getLatestSyncDate();
    if (!latestSync) return false;
    const diffMs = Date.now() - new Date(latestSync).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= maxAgeDays;
  }

  private mapSourceRow(row: Record<string, unknown>): WatchSourceRecord {
    return {
      id: String(row.id),
      url: String(row.url),
      kind: row.kind as WatchSourceKind,
      lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
      contentHash: row.content_hash ? String(row.content_hash) : null,
    };
  }

  private mapEntryRow(row: Record<string, unknown>): WatchEntryRecord {
    return {
      id: String(row.id),
      sourceId: String(row.source_id),
      title: String(row.title),
      summary: String(row.summary),
      pubDate: String(row.pub_date),
      officialUrl: String(row.official_url),
      confirmed: Number(row.confirmed) === 1,
      createdAt: String(row.created_at),
    };
  }
}
