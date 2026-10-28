import crypto from 'node:crypto';
import path from 'node:path';
import {
  loadSeoConfig,
  walkProjectFiles,
  type ExtractedRouteData,
  type ProjectRecord,
} from '@seo-partner/core';
import {
  ProjectRepository,
  RouteRepository,
  SeoDatabase,
} from '@seo-partner/store';
import {
  detectActiveAdapters,
  parseRobotsFiles,
  parseSitemapFiles,
} from '@seo-partner/adapters';

export interface ScanCommandOptions {
  readonly projectRoot: string;
  readonly scopeDir?: string;
  readonly rebuild?: boolean;
  readonly maxFileSizeKb?: number;
}

export interface ScanCommandResult {
  readonly projectId: string;
  readonly projectName: string;
  readonly frameworks: ReadonlyArray<string>;
  readonly durationMs: number;
  readonly filesScanned: number;
  readonly filesSkippedSecretOrIgnored: number;
  readonly filesSkippedOversized: number;
  readonly routesDiscovered: number;
  readonly hasRobotsTxt: boolean;
  readonly hasSitemap: boolean;
}

export function computeProjectId(projectRoot: string): string {
  const normalized = path.resolve(projectRoot).replace(/\\/g, '/').toLowerCase();
  const digest = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 8);
  return `proj_${digest}`;
}

export async function runScanCommand(
  options: ScanCommandOptions,
): Promise<ScanCommandResult> {
  const startTime = Date.now();
  const projectRoot = path.resolve(options.projectRoot);
  const config = loadSeoConfig(projectRoot);
  const projectId = computeProjectId(projectRoot);
  const projectName = config?.projectName ?? (path.basename(projectRoot) || 'seo-project');

  const walkRes = await walkProjectFiles({
    projectRoot,
    projectId,
    scopeDir: options.scopeDir,
    maxFileSizeKb: options.maxFileSizeKb ?? config?.maxFileSizeKb ?? 1024,
    extraExcludePatterns: config?.excludePatterns,
  });

  const filePaths = walkRes.files.map((f) => f.path);
  const robotsInfo = parseRobotsFiles(filePaths, walkRes.contentsByPath);
  const sitemapInfo = parseSitemapFiles(filePaths, walkRes.contentsByPath);

  const activeAdapters = await detectActiveAdapters(
    projectRoot,
    filePaths,
    walkRes.contentsByPath,
  );

  const extractedRoutes: ExtractedRouteData[] = [];
  const seenRouteKeys = new Set<string>();

  for (const adapter of activeAdapters) {
    const discovered = await adapter.discoverRoutes(
      projectRoot,
      filePaths,
      walkRes.contentsByPath,
      sitemapInfo.routePaths,
    );
    for (const route of discovered) {
      const key = `${route.routerKind}:${route.pattern}`;
      if (seenRouteKeys.has(key)) continue;
      seenRouteKeys.add(key);

      const content = walkRes.contentsByPath.get(route.filePath) ?? '';
      const extracted = await adapter.extractRoute(projectRoot, route, content);
      extractedRoutes.push(extracted);
    }
  }

  const now = new Date().toISOString();
  const projectRecord: ProjectRecord = {
    id: projectId,
    rootPath: projectRoot,
    name: projectName,
    frameworks: activeAdapters.map((a) => a.id),
    hasRobotsTxt: robotsInfo.exists,
    hasSitemap: sitemapInfo.exists,
    createdAt: config?.createdAt ?? now,
    lastScannedAt: now,
  };

  const store = SeoDatabase.open(projectRoot, { rebuild: options.rebuild });
  try {
    const projectRepo = new ProjectRepository(store);
    const routeRepo = new RouteRepository(store);

    store.runInTransaction(() => {
      projectRepo.upsertProject(projectRecord);
      const fileIdByPath = projectRepo.replaceProjectFiles(projectId, walkRes.files);
      routeRepo.replaceExtractedRoutes(projectId, fileIdByPath, extractedRoutes);
    });
  } finally {
    store.close();
  }

  return {
    projectId,
    projectName,
    frameworks: projectRecord.frameworks,
    durationMs: Date.now() - startTime,
    filesScanned: walkRes.files.length,
    filesSkippedSecretOrIgnored: walkRes.skippedSecretOrIgnoredCount,
    filesSkippedOversized: walkRes.skippedOversizedCount,
    routesDiscovered: extractedRoutes.length,
    hasRobotsTxt: robotsInfo.exists,
    hasSitemap: sitemapInfo.exists,
  };
}

