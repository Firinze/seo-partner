import fs from 'node:fs';
import path from 'node:path';
import type { Finding, RuleCategory, SeverityLevel } from '@seo-partner/core';
import {
  CrawlRepository,
  FindingRepository,
  ProjectRepository,
  RouteRepository,
  SeoDatabase,
} from '@seo-partner/store';
import { ALL_V02_RULES, runRulesEngine } from '@seo-partner/rules';
import { runScanCommand } from './scan.js';

export interface AuditCommandOptions {
  readonly projectRoot: string;
  readonly category?: RuleCategory;
  readonly severity?: SeverityLevel;
  readonly crawlRunId?: string;
}

export interface AuditCommandResult {
  readonly projectId: string;
  readonly crawlRunId: string | null;
  readonly activeRulesCount: number;
  readonly totalFindings: number;
  readonly blockingIndexingCount: number;
  readonly bySeverity: Record<SeverityLevel, number>;
  readonly findings: ReadonlyArray<Finding>;
}

export type AuditOptions = AuditCommandOptions;
export type AuditResult = AuditCommandResult;

export async function runAuditCommand(
  options: AuditCommandOptions,
): Promise<AuditCommandResult> {
  const projectRoot = path.resolve(options.projectRoot);

  let store = SeoDatabase.open(projectRoot);
  let project = new ProjectRepository(store).getLatestProject();
  store.close();

  if (!project) {
    await runScanCommand({ projectRoot });
    store = SeoDatabase.open(projectRoot);
    project = new ProjectRepository(store).getLatestProject();
    store.close();
  }

  if (!project) {
    throw new Error('Could not initialize project index for audit');
  }

  store = SeoDatabase.open(projectRoot);
  try {
    const projectRepo = new ProjectRepository(store);
    const routeRepo = new RouteRepository(store);
    const crawlRepo = new CrawlRepository(store);
    const findingRepo = new FindingRepository(store);

    const files = projectRepo.listProjectFiles(project.id);
    const sitemapFile = files.find((f) => f.kind === 'sitemap')?.path ?? null;
    const robotsFile = files.find((f) => f.kind === 'robots')?.path ?? null;
    let robotsTxtContent: string | null = null;
    if (robotsFile && robotsFile.endsWith('.txt')) {
      try {
        robotsTxtContent = fs.readFileSync(path.join(projectRoot, robotsFile), 'utf-8');
      } catch {
        robotsTxtContent = null;
      }
    }

    const routes = routeRepo.loadExtractedRoutes(project.id);
    const activeCrawlRun = options.crawlRunId
      ? crawlRepo.getCrawlRunById(options.crawlRunId)
      : crawlRepo.getLatestCompletedCrawlRun(project.id);
    const crawlPages = activeCrawlRun ? crawlRepo.getCrawlPages(activeCrawlRun.id) : [];

    const evaluatedFindings = runRulesEngine({
      project,
      routes,
      sitemapFilePath: sitemapFile,
      crawlPages,
      robotsTxtContent,
      robotsFilePath: robotsFile,
    });

    store.runInTransaction(() => {
      findingRepo.syncRulesCatalog(ALL_V02_RULES);
      findingRepo.syncFindingsAndActions(evaluatedFindings);
    });

    const filteredFindings = findingRepo.listFindings({
      category: options.category,
      severity: options.severity,
    });

    const bySeverity: Record<SeverityLevel, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    let blockingIndexingCount = 0;

    for (const f of filteredFindings) {
      bySeverity[f.severity] += 1;
      if (f.blocksIndexing) blockingIndexingCount += 1;
    }

    return {
      projectId: project.id,
      crawlRunId: activeCrawlRun?.id ?? null,
      activeRulesCount: ALL_V02_RULES.length,
      totalFindings: filteredFindings.length,
      blockingIndexingCount,
      bySeverity,
      findings: filteredFindings,
    };
  } finally {
    store.close();
  }
}

export const executeAudit = runAuditCommand;

