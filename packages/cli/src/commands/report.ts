import fs from 'node:fs';
import path from 'node:path';
import {
  loadSeoConfig,
  type ReportFormat,
  type ReportType,
  type SupportedLanguage,
} from '@seo-partner/core';
import {
  CrawlRepository,
  FindingRepository,
  ProjectRepository,
  SeoDatabase,
} from '@seo-partner/store';
import { writeHtmlReport, writeMarkdownReport } from '@seo-partner/rules';
import { runAuditCommand } from './audit.js';

export interface ReportCommandOptions {
  readonly projectRoot: string;
  readonly reportType?: ReportType;
  readonly format?: ReportFormat;
  readonly outputPath?: string;
  readonly lang?: SupportedLanguage;
  readonly crawlRunId?: string;
}

export interface ReportCommandResult {
  readonly reportType: ReportType;
  readonly format: ReportFormat;
  readonly lang: SupportedLanguage;
  readonly filePath: string;
  readonly totalFindings: number;
  readonly blockingIndexingCount: number;
}

export async function runReportCommand(
  options: ReportCommandOptions,
): Promise<ReportCommandResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const config = loadSeoConfig(projectRoot);
  const lang: SupportedLanguage = options.lang ?? config?.lang ?? 'en';
  const reportType: ReportType = options.reportType ?? 'audit-complet';
  const format: ReportFormat = options.format ?? 'md';

  await runAuditCommand({ projectRoot, crawlRunId: options.crawlRunId });

  const store = SeoDatabase.open(projectRoot);
  try {
    const project = new ProjectRepository(store).getLatestProject();
    if (!project) {
      throw new Error('No scanned project found in .seo/index.db');
    }

    const findingRepo = new FindingRepository(store);
    const crawlRepo = new CrawlRepository(store);
    const findings = findingRepo.listFindings({
      category: reportType === 'audit-technique' ? 'technical' : undefined,
    });
    const actions = findingRepo.listPrioritizedActions();
    const crawlRun = options.crawlRunId
      ? crawlRepo.getCrawlRunById(options.crawlRunId)
      : crawlRepo.getLatestCompletedCrawlRun(project.id);

    let filePath: string;
    if (format === 'html') {
      const written = writeHtmlReport({
        projectRoot,
        project,
        findings,
        actions,
        lang,
        reportType,
        customOutputPath: options.outputPath,
        crawlRun,
      });
      filePath = written.filePath;
    } else if (format === 'json') {
      const today = new Date().toISOString().slice(0, 10);
      const defaultRelPath = path.join('docs', 'seo', `${today}-${reportType}.json`);
      filePath = options.outputPath
        ? path.resolve(projectRoot, options.outputPath)
        : path.resolve(projectRoot, defaultRelPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          {
            project,
            reportType,
            lang,
            generatedAt: new Date().toISOString(),
            crawlRun: crawlRun ?? null,
            findings,
            actions,
          },
          null,
          2,
        ),
        'utf-8',
      );
    } else {
      const written = writeMarkdownReport({
        projectRoot,
        project,
        findings,
        actions,
        lang,
        reportType,
        customOutputPath: options.outputPath,
        crawlRun,
      });
      filePath = written.filePath;
    }

    return {
      reportType,
      format,
      lang,
      filePath,
      totalFindings: findings.length,
      blockingIndexingCount: findings.filter((f) => f.blocksIndexing).length,
    };
  } finally {
    store.close();
  }
}
