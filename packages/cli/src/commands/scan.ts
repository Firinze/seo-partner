import crypto from 'node:crypto';
import path from 'node:path';
import {
  loadSeoConfig,
  walkProjectFiles,
  type ExtractedRouteData,
  type ProjectRecord,
  type ScannedFile,
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
  readonly incremental: boolean;
  readonly durationMs: number;
  readonly filesScanned: number;
  readonly filesParsed: number;
  readonly filesReused: number;
  readonly filesPurged: number;
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

  const store = SeoDatabase.open(projectRoot, { rebuild: options.rebuild });
  try {
    const projectRepo = new ProjectRepository(store);
    const routeRepo = new RouteRepository(store);

    const existingFilesByPath: Map<string, ScannedFile> = options.rebuild
      ? new Map()
      : projectRepo.getExistingFilesByPath(projectId);
    const incremental = !options.rebuild && existingFilesByPath.size > 0;

    const walkRes = await walkProjectFiles({
      projectRoot,
      projectId,
      scopeDir: options.scopeDir,
      maxFileSizeKb: options.maxFileSizeKb ?? config?.maxFileSizeKb ?? 1024,
      extraExcludePatterns: config?.excludePatterns,
      existingFilesByPath: incremental ? existingFilesByPath : undefined,
    });

    const filePaths = walkRes.files.map((f) => f.path);
    const robotsInfo = parseRobotsFiles(filePaths, walkRes.contentsByPath);
    const sitemapInfo = parseSitemapFiles(filePaths, walkRes.contentsByPath);

    const activeAdapters = await detectActiveAdapters(
      projectRoot,
      filePaths,
      walkRes.contentsByPath,
    );

    // Check if any shared layout, sitemap, or route manifest changed
    let sharedDependencyChanged = !incremental;
    if (incremental) {
      for (const changedPath of walkRes.changedPaths) {
        const f = walkRes.files.find((item) => item.path === changedPath);
        if (
          f &&
          (f.kind === 'layout' || f.kind === 'sitemap' || f.kind === 'config')
        ) {
          sharedDependencyChanged = true;
          break;
        }
      }
      for (const purgedPath of walkRes.purgedPaths) {
        const prev = existingFilesByPath.get(purgedPath);
        if (
          prev &&
          (prev.kind === 'layout' || prev.kind === 'sitemap' || prev.kind === 'config')
        ) {
          sharedDependencyChanged = true;
          break;
        }
      }
    }

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

        if (
          incremental &&
          !sharedDependencyChanged &&
          !walkRes.changedPaths.has(route.filePath)
        ) {
          continue;
        }

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

    let routesDiscovered = 0;

    store.runInTransaction(() => {
      projectRepo.upsertProject(projectRecord);
      if (incremental && !sharedDependencyChanged) {
        const changedFiles = walkRes.files.filter((f) => walkRes.changedPaths.has(f.path));
        const { fileIdByPath, changedFileIds } = projectRepo.applyIncrementalFiles(
          projectId,
          changedFiles,
          walkRes.purgedPaths,
          existingFilesByPath,
        );
        routeRepo.saveIncrementalScanResults(
          projectId,
          fileIdByPath,
          changedFileIds,
          extractedRoutes,
        );
        routesDiscovered = routeRepo.countProjectRoutes(projectId);
      } else {
        const fileIdByPath = projectRepo.replaceProjectFiles(projectId, walkRes.files);
        routeRepo.replaceExtractedRoutes(projectId, fileIdByPath, extractedRoutes);
        routesDiscovered = extractedRoutes.length;
      }
    });

    return {
      projectId,
      projectName,
      frameworks: projectRecord.frameworks,
      incremental,
      durationMs: Date.now() - startTime,
      filesScanned: walkRes.files.length,
      filesParsed: walkRes.changedPaths.size,
      filesReused: walkRes.reusedPaths.size,
      filesPurged: walkRes.purgedPaths.size,
      filesSkippedSecretOrIgnored: walkRes.skippedSecretOrIgnoredCount,
      filesSkippedOversized: walkRes.skippedOversizedCount,
      routesDiscovered,
      hasRobotsTxt: robotsInfo.exists,
      hasSitemap: sitemapInfo.exists,
    };
  } finally {
    store.close();
  }
}
