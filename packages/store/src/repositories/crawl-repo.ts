import type {
  CrawlConfig,
  CrawlPage,
  CrawlRedirectHop,
  CrawlRun,
  CrawlRunStatus,
} from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class CrawlRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public createCrawlRun(run: CrawlRun): void {
    this.store.db
      .prepare(
        `INSERT INTO crawl_run (
          id, project_id, start_url, config_json, status, pages_crawled, errors_count, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          pages_crawled = excluded.pages_crawled,
          errors_count = excluded.errors_count,
          completed_at = excluded.completed_at`,
      )
      .run(
        run.id,
        run.projectId,
        run.startUrl,
        JSON.stringify(run.config),
        run.status,
        run.pagesCrawled,
        run.errorsCount,
        run.startedAt,
        run.completedAt,
      );
  }

  public updateCrawlRunStatus(
    runId: string,
    status: CrawlRunStatus,
    pagesCrawled: number,
    errorsCount: number,
    completedAt: string | null = null,
  ): void {
    this.store.db
      .prepare(
        `UPDATE crawl_run
         SET status = ?, pages_crawled = ?, errors_count = ?, completed_at = ?
         WHERE id = ?`,
      )
      .run(status, pagesCrawled, errorsCount, completedAt, runId);
  }

  public upsertCrawlPage(page: CrawlPage): void {
    this.store.db
      .prepare(
        `INSERT INTO crawl_page (
          crawl_run_id, url, route_pattern, status_code, redirect_chain_json,
          response_time_ms, depth, x_robots_tag, http_canonical,
          title, description, canonical, robots_meta, h1, html_lang,
          og_json, hreflang_json, internal_links_json, broken_links_json,
          untrusted_external, crawled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(crawl_run_id, url) DO UPDATE SET
          route_pattern = excluded.route_pattern,
          status_code = excluded.status_code,
          redirect_chain_json = excluded.redirect_chain_json,
          response_time_ms = excluded.response_time_ms,
          depth = excluded.depth,
          x_robots_tag = excluded.x_robots_tag,
          http_canonical = excluded.http_canonical,
          title = excluded.title,
          description = excluded.description,
          canonical = excluded.canonical,
          robots_meta = excluded.robots_meta,
          h1 = excluded.h1,
          html_lang = excluded.html_lang,
          og_json = excluded.og_json,
          hreflang_json = excluded.hreflang_json,
          internal_links_json = excluded.internal_links_json,
          broken_links_json = excluded.broken_links_json,
          untrusted_external = excluded.untrusted_external,
          crawled_at = excluded.crawled_at`,
      )
      .run(
        page.crawlRunId,
        page.url,
        page.routePattern,
        page.statusCode,
        JSON.stringify(page.redirectChain),
        page.responseTimeMs,
        page.depth,
        page.xRobotsTag,
        page.httpCanonical,
        page.title,
        page.description,
        page.canonical,
        page.robotsMeta,
        page.h1,
        page.htmlLang,
        JSON.stringify(page.openGraph),
        JSON.stringify(page.hreflang),
        JSON.stringify(page.internalLinks),
        JSON.stringify(page.brokenLinks),
        page.untrustedExternal ? 1 : 0,
        page.crawledAt,
      );
  }

  public getLatestCompletedCrawlRun(projectId: string): CrawlRun | null {
    const row = this.store.db
      .prepare(
        `SELECT * FROM crawl_run
         WHERE project_id = ? AND status = 'completed'
         ORDER BY completed_at DESC, started_at DESC
         LIMIT 1`,
      )
      .get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToCrawlRun(row);
  }

  public getCrawlRunById(runId: string): CrawlRun | null {
    const row = this.store.db
      .prepare('SELECT * FROM crawl_run WHERE id = ?')
      .get(runId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToCrawlRun(row);
  }

  public listCrawlRuns(projectId: string): ReadonlyArray<CrawlRun> {
    const rows = this.store.db
      .prepare('SELECT * FROM crawl_run WHERE project_id = ? ORDER BY started_at DESC')
      .all(projectId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRowToCrawlRun(r));
  }

  public getCrawlPages(crawlRunId: string): ReadonlyArray<CrawlPage> {
    const rows = this.store.db
      .prepare('SELECT * FROM crawl_page WHERE crawl_run_id = ? ORDER BY depth ASC, url ASC')
      .all(crawlRunId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapRowToCrawlPage(r));
  }

  private mapRowToCrawlRun(row: Record<string, unknown>): CrawlRun {
    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      startUrl: String(row['start_url']),
      config: JSON.parse(String(row['config_json'] ?? '{}')) as CrawlConfig,
      status: String(row['status']) as CrawlRunStatus,
      pagesCrawled: Number(row['pages_crawled'] ?? 0),
      errorsCount: Number(row['errors_count'] ?? 0),
      startedAt: String(row['started_at']),
      completedAt: row['completed_at'] ? String(row['completed_at']) : null,
    };
  }

  private mapRowToCrawlPage(row: Record<string, unknown>): CrawlPage {
    return {
      id: Number(row['id']),
      crawlRunId: String(row['crawl_run_id']),
      url: String(row['url']),
      routePattern: String(row['route_pattern']),
      statusCode: Number(row['status_code']),
      redirectChain: JSON.parse(
        String(row['redirect_chain_json'] ?? '[]'),
      ) as CrawlRedirectHop[],
      responseTimeMs: Number(row['response_time_ms'] ?? 0),
      depth: Number(row['depth'] ?? 0),
      xRobotsTag: row['x_robots_tag'] ? String(row['x_robots_tag']) : null,
      httpCanonical: row['http_canonical'] ? String(row['http_canonical']) : null,
      title: row['title'] !== null && row['title'] !== undefined ? String(row['title']) : null,
      description:
        row['description'] !== null && row['description'] !== undefined
          ? String(row['description'])
          : null,
      canonical:
        row['canonical'] !== null && row['canonical'] !== undefined
          ? String(row['canonical'])
          : null,
      robotsMeta:
        row['robots_meta'] !== null && row['robots_meta'] !== undefined
          ? String(row['robots_meta'])
          : null,
      h1: row['h1'] !== null && row['h1'] !== undefined ? String(row['h1']) : null,
      htmlLang:
        row['html_lang'] !== null && row['html_lang'] !== undefined
          ? String(row['html_lang'])
          : null,
      openGraph: JSON.parse(String(row['og_json'] ?? '{}')) as Record<string, string>,
      hreflang: JSON.parse(String(row['hreflang_json'] ?? '[]')) as Array<{
        lang: string;
        url: string;
      }>,
      internalLinks: JSON.parse(String(row['internal_links_json'] ?? '[]')) as string[],
      brokenLinks: JSON.parse(String(row['broken_links_json'] ?? '[]')) as string[],
      untrustedExternal: Number(row['untrusted_external'] ?? 1) === 1,
      crawledAt: String(row['crawled_at']),
    };
  }
}

