import path from 'node:path';
import {
  loadSeoConfig,
  type ReportType,
  type SupportedLanguage,
} from '@seo-partner/core';
import {
  FindingRepository,
  ProjectRepository,
  SeoDatabase,
} from '@seo-partner/store';
import { writeMarkdownReport } from '@seo-partner/rules';
import { runAuditCommand } from './audit.js';

export interface ReportCommandOptions {
  readonly projectRoot: string;
  readonly reportType?: ReportType;
  readonly outputPath?: string;
  readonly lang?: SupportedLanguage;
}

export interface ReportCommandResult {
  readonly reportType: ReportType;
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

  await runAuditCommand({ projectRoot });

  const store = SeoDatabase.open(projectRoot);
  try {
    const project = new ProjectRepository(store).getLatestProject();
    if (!project) {
      throw new Error('No scanned project found in .seo/index.db');
    }

    const findingRepo = new FindingRepository(store);
    const findings = findingRepo.listFindings({
      category: reportType === 'audit-technique' ? 'technical' : undefined,
    });
    const actions = findingRepo.listPrioritizedActions();

    const written = writeMarkdownReport({
      projectRoot,
      project,
      findings,
      actions,
      lang,
      reportType,
      customOutputPath: options.outputPath,
    });

    return {
      reportType,
      lang,
      filePath: written.filePath,
      totalFindings: findings.length,
      blockingIndexingCount: findings.filter((f) => f.blocksIndexing).length,
    };
  } finally {
    store.close();
  }
}

