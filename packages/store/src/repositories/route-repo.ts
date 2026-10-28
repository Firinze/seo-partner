import type {
  DiscoveredRoute,
  ExtractedRouteData,
  FtsSearchResult,
  HeadingItem,
  ImageItem,
  JsonLdItem,
  LinkItem,
} from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class RouteRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public replaceExtractedRoutes(
    projectId: string,
    fileIdByPath: ReadonlyMap<string, number>,
    extractedList: ReadonlyArray<ExtractedRouteData>,
  ): void {
    this.store.db.prepare('DELETE FROM route WHERE project_id = ?').run(projectId);
    this.cleanOrphanedFtsEntries();
    this.insertExtractedRoutesBatch(projectId, fileIdByPath, extractedList);
  }

  public saveIncrementalScanResults(
    projectId: string,
    fileIdByPath: ReadonlyMap<string, number>,
    changedFileIds: ReadonlySet<number>,
    extractedForChangedFiles: ReadonlyArray<ExtractedRouteData>,
  ): void {
    const deleteRouteByFileStmt = this.store.db.prepare(
      'DELETE FROM route WHERE project_id = ? AND file_id = ?',
    );
    for (const fileId of changedFileIds) {
      deleteRouteByFileStmt.run(projectId, fileId);
    }

    this.cleanOrphanedFtsEntries();
    this.insertExtractedRoutesBatch(projectId, fileIdByPath, extractedForChangedFiles);
  }

  public countProjectRoutes(projectId: string): number {
    const row = this.store.db
      .prepare('SELECT COUNT(*) AS cnt FROM route WHERE project_id = ?')
      .get(projectId) as { cnt: number } | undefined;
    return Number(row?.cnt ?? 0);
  }

  public searchFts(
    projectId: string,
    rawQuery: string,
    limit = 20,
  ): ReadonlyArray<FtsSearchResult> {
    const cleaned = rawQuery.trim();
    if (!cleaned) return [];

    const tokens = cleaned
      .split(/\s+/)
      .map((t) => t.replace(/"/g, '').trim())
      .filter((t) => t.length > 0);
    if (tokens.length === 0) return [];

    const ftsQuery = tokens.map((t) => `"${t}"*`).join(' OR ');

    const rows = this.store.db
      .prepare(
        `SELECT fts.route_id, fts.route_pattern, fts.title, fts.description, fts.headings_text, fts.rank
         FROM fts_page_index fts
         JOIN route r ON r.id = CAST(fts.route_id AS INTEGER)
         WHERE r.project_id = ? AND fts_page_index MATCH ?
         ORDER BY fts.rank ASC
         LIMIT ?`,
      )
      .all(projectId, ftsQuery, limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      routeId: Number(row['route_id']),
      routePattern: String(row['route_pattern']),
      title: row['title'] ? String(row['title']) : null,
      description: row['description'] ? String(row['description']) : null,
      headingsText: row['headings_text'] ? String(row['headings_text']) : null,
      rank: Number(row['rank'] ?? 0),
    }));
  }

  private cleanOrphanedFtsEntries(): void {
    this.store.db
      .prepare(
        'DELETE FROM fts_page_index WHERE CAST(route_id AS INTEGER) NOT IN (SELECT id FROM route)',
      )
      .run();
  }

  private insertExtractedRoutesBatch(
    projectId: string,
    fileIdByPath: ReadonlyMap<string, number>,
    extractedList: ReadonlyArray<ExtractedRouteData>,
  ): void {
    const insertRouteStmt = this.store.db.prepare(
      `INSERT INTO route (project_id, file_id, pattern, router_kind, rendering_mode, is_private, in_sitemap)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    const insertMetaStmt = this.store.db.prepare(
      `INSERT INTO page_meta (
        route_id, title, title_line, description, description_line,
        canonical, canonical_line, robots, robots_line,
        html_lang, html_lang_line,
        h1_count, h1_first_text, h1_line, headings_json, og_json, hreflang_json, images_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const insertFtsStmt = this.store.db.prepare(
      `INSERT INTO fts_page_index (route_id, route_pattern, title, description, headings_text)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const insertLinkStmt = this.store.db.prepare(
      `INSERT INTO link (from_route_id, to_url, anchor_text, kind, rel, line)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const insertSchemaStmt = this.store.db.prepare(
      `INSERT INTO schema_item (route_id, schema_type, raw_json, is_valid, validation_error, line)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    for (const item of extractedList) {
      const fileId = fileIdByPath.get(item.route.filePath);
      if (fileId === undefined) continue;

      const routeRes = insertRouteStmt.run(
        projectId,
        fileId,
        item.route.pattern,
        item.route.routerKind,
        item.route.renderingMode,
        item.route.isPrivate ? 1 : 0,
        item.route.inSitemap ? 1 : 0,
      );
      const routeId = Number(routeRes.lastInsertRowid);

      const h1s = item.headings.filter((h) => h.level === 1);
      const firstH1 = h1s[0];

      insertMetaStmt.run(
        routeId,
        item.title?.value ?? null,
        item.title?.line ?? null,
        item.description?.value ?? null,
        item.description?.line ?? null,
        item.canonical?.value ?? null,
        item.canonical?.line ?? null,
        item.robots?.value ?? null,
        item.robots?.line ?? null,
        item.htmlLang?.value ?? null,
        item.htmlLang?.line ?? null,
        h1s.length,
        firstH1?.text ?? null,
        firstH1?.line ?? null,
        JSON.stringify(item.headings),
        JSON.stringify(item.openGraph),
        JSON.stringify(item.hreflang),
        JSON.stringify(item.images),
      );

      const headingsText = item.headings.map((h) => h.text).join(' ');
      insertFtsStmt.run(
        String(routeId),
        item.route.pattern,
        item.title?.value ?? '',
        item.description?.value ?? '',
        headingsText,
      );

      for (const link of item.links) {
        insertLinkStmt.run(
          routeId,
          link.toUrl,
          link.anchorText,
          link.kind,
          link.rel,
          link.line,
        );
      }

      for (const schema of item.jsonLdItems) {
        insertSchemaStmt.run(
          routeId,
          schema.schemaType,
          schema.rawJson,
          schema.isValid ? 1 : 0,
          schema.validationError,
          schema.line,
        );
      }
    }
  }

  public loadExtractedRoutes(projectId: string): ReadonlyArray<ExtractedRouteData> {
    const routeRows = this.store.db
      .prepare(
        `SELECT r.*, f.path AS file_path,
                pm.title, pm.title_line, pm.description, pm.description_line,
                pm.canonical, pm.canonical_line, pm.robots, pm.robots_line,
                pm.html_lang, pm.html_lang_line,
                pm.headings_json, pm.og_json, pm.hreflang_json, pm.images_json
         FROM route r
         JOIN file f ON f.id = r.file_id
         LEFT JOIN page_meta pm ON pm.route_id = r.id
         WHERE r.project_id = ?
         ORDER BY r.pattern ASC`,
      )
      .all(projectId) as Array<Record<string, unknown>>;

    const linkStmt = this.store.db.prepare(
      'SELECT * FROM link WHERE from_route_id = ? ORDER BY line ASC',
    );
    const schemaStmt = this.store.db.prepare(
      'SELECT * FROM schema_item WHERE route_id = ? ORDER BY line ASC',
    );

    return routeRows.map((row) => {
      const routeId = Number(row['id']);
      const route: DiscoveredRoute = {
        id: routeId,
        pattern: String(row['pattern']),
        filePath: String(row['file_path']),
        routerKind: String(row['router_kind']) as DiscoveredRoute['routerKind'],
        renderingMode: String(row['rendering_mode']) as DiscoveredRoute['renderingMode'],
        isPrivate: Number(row['is_private']) === 1,
        inSitemap: Number(row['in_sitemap']) === 1,
      };

      const linkRows = linkStmt.all(routeId) as Array<Record<string, unknown>>;
      const links: LinkItem[] = linkRows.map((l) => ({
        toUrl: String(l['to_url']),
        anchorText: String(l['anchor_text'] ?? ''),
        kind: String(l['kind']) as LinkItem['kind'],
        rel: l['rel'] ? String(l['rel']) : null,
        line: Number(l['line']),
      }));

      const schemaRows = schemaStmt.all(routeId) as Array<Record<string, unknown>>;
      const jsonLdItems: JsonLdItem[] = schemaRows.map((s) => ({
        schemaType: s['schema_type'] ? String(s['schema_type']) : null,
        rawJson: String(s['raw_json']),
        isValid: Number(s['is_valid']) === 1,
        validationError: s['validation_error'] ? String(s['validation_error']) : null,
        line: Number(s['line']),
      }));

      return {
        route,
        title:
          row['title'] !== null && row['title'] !== undefined
            ? { value: String(row['title']), line: Number(row['title_line'] ?? 1) }
            : null,
        description:
          row['description'] !== null && row['description'] !== undefined
            ? { value: String(row['description']), line: Number(row['description_line'] ?? 1) }
            : null,
        canonical:
          row['canonical'] !== null && row['canonical'] !== undefined
            ? { value: String(row['canonical']), line: Number(row['canonical_line'] ?? 1) }
            : null,
        robots:
          row['robots'] !== null && row['robots'] !== undefined
            ? { value: String(row['robots']), line: Number(row['robots_line'] ?? 1) }
            : null,
        htmlLang:
          row['html_lang'] !== null && row['html_lang'] !== undefined
            ? { value: String(row['html_lang']), line: Number(row['html_lang_line'] ?? 1) }
            : undefined,
        headings: JSON.parse(String(row['headings_json'] ?? '[]')) as HeadingItem[],
        openGraph: JSON.parse(String(row['og_json'] ?? '{}')) as Record<string, string>,
        hreflang: JSON.parse(String(row['hreflang_json'] ?? '[]')) as Array<{
          lang: string;
          url: string;
        }>,
        images: JSON.parse(String(row['images_json'] ?? '[]')) as ImageItem[],
        links,
        jsonLdItems,
      };
    });
  }
}
