import type { ProjectRecord, ScannedFile } from '@seo-partner/core';
import type { SeoDatabase } from '../db.js';

export class ProjectRepository {
  public constructor(private readonly store: SeoDatabase) {}

  public upsertProject(project: ProjectRecord): void {
    this.store.db
      .prepare(
        `INSERT INTO project (id, root_path, name, frameworks_json, has_robots_txt, has_sitemap, created_at, last_scanned_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           root_path = excluded.root_path,
           name = excluded.name,
           frameworks_json = excluded.frameworks_json,
           has_robots_txt = excluded.has_robots_txt,
           has_sitemap = excluded.has_sitemap,
           last_scanned_at = excluded.last_scanned_at`,
      )
      .run(
        project.id,
        project.rootPath,
        project.name,
        JSON.stringify(project.frameworks),
        project.hasRobotsTxt ? 1 : 0,
        project.hasSitemap ? 1 : 0,
        project.createdAt,
        project.lastScannedAt,
      );
  }

  public getProject(projectId: string): ProjectRecord | null {
    const row = this.store.db
      .prepare('SELECT * FROM project WHERE id = ?')
      .get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToProject(row);
  }

  public getLatestProject(): ProjectRecord | null {
    const row = this.store.db
      .prepare('SELECT * FROM project ORDER BY last_scanned_at DESC, created_at DESC LIMIT 1')
      .get() as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToProject(row);
  }

  public replaceProjectFiles(
    projectId: string,
    files: ReadonlyArray<ScannedFile>,
  ): Map<string, number> {
    const fileIdByPath = new Map<string, number>();

    this.store.db.prepare('DELETE FROM file WHERE project_id = ?').run(projectId);

    const insertStmt = this.store.db.prepare(
      `INSERT INTO file (project_id, path, hash, mtime_ms, size_bytes, kind, scanned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const file of files) {
      const res = insertStmt.run(
        projectId,
        file.path,
        file.hash,
        file.mtimeMs,
        file.sizeBytes,
        file.kind,
        file.scannedAt,
      );
      fileIdByPath.set(file.path, Number(res.lastInsertRowid));
    }

    return fileIdByPath;
  }

  public listProjectFiles(projectId: string): ReadonlyArray<ScannedFile> {
    const rows = this.store.db
      .prepare('SELECT * FROM file WHERE project_id = ? ORDER BY path ASC')
      .all(projectId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: Number(row['id']),
      projectId: String(row['project_id']),
      path: String(row['path']),
      hash: String(row['hash']),
      mtimeMs: Number(row['mtime_ms']),
      sizeBytes: Number(row['size_bytes']),
      kind: String(row['kind']) as ScannedFile['kind'],
      scannedAt: String(row['scanned_at']),
    }));
  }

  private mapRowToProject(row: Record<string, unknown>): ProjectRecord {
    return {
      id: String(row['id']),
      rootPath: String(row['root_path']),
      name: String(row['name']),
      frameworks: JSON.parse(String(row['frameworks_json'] ?? '[]')) as string[],
      hasRobotsTxt: Number(row['has_robots_txt']) === 1,
      hasSitemap: Number(row['has_sitemap']) === 1,
      createdAt: String(row['created_at']),
      lastScannedAt: row['last_scanned_at'] ? String(row['last_scanned_at']) : null,
    };
  }
}

