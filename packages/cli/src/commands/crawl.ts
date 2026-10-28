import path from 'node:path';
import { loadSeoConfig, type ProjectRecord } from '@seo-partner/core';
import { ProjectRepository, SeoDatabase } from '@seo-partner/store';
import { runHttpCrawler, type HttpCrawlerResult } from '@seo-partner/crawler';
import { computeProjectId } from './scan.js';

export interface CrawlCommandOptions {
  readonly projectRoot: string;
  readonly startUrl: string;
  readonly resumeRunId?: string;
  readonly offline?: boolean;
  readonly maxPages?: number;
  readonly maxDepth?: number;
  readonly concurrency?: number;
  readonly rateLimitMs?: number;
  readonly maxRedirects?: number;
  readonly allowLocal?: boolean;
  readonly js?: boolean;
}

export async function runCrawlCommand(
  options: CrawlCommandOptions,
): Promise<HttpCrawlerResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const config = loadSeoConfig(projectRoot);
  const projectId = computeProjectId(projectRoot);
  const projectName = config?.projectName ?? (path.basename(projectRoot) || 'seo-project');

  const store = SeoDatabase.open(projectRoot);
  try {
    const projectRepo = new ProjectRepository(store);
    const existingProject = projectRepo.getProject(projectId);
    if (!existingProject) {
      const now = new Date().toISOString();
      const record: ProjectRecord = {
        id: projectId,
        rootPath: projectRoot,
        name: projectName,
        frameworks: [],
        hasRobotsTxt: false,
        hasSitemap: false,
        createdAt: config?.createdAt ?? now,
        lastScannedAt: null,
      };
      projectRepo.upsertProject(record);
    }

    return await runHttpCrawler({
      projectRoot,
      projectId,
      startUrl: options.startUrl,
      store,
      resumeRunId: options.resumeRunId,
      offline: options.offline,
      maxPages: options.maxPages,
      maxDepth: options.maxDepth,
      concurrency: options.concurrency,
      rateLimitMs: options.rateLimitMs,
      maxRedirects: options.maxRedirects,
      allowLocal: options.allowLocal,
      js: options.js,
    });
  } finally {
    store.close();
  }
}

