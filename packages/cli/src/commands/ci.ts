import fs from 'node:fs';
import path from 'node:path';
import type { CiEvaluationResult } from '@seo-partner/core';
import {
  runScanCommand,
  runAuditCommand,
  evaluateCiThresholds,
  serializeToSarifLog,
} from '@seo-partner/tools';

export interface CiCommandCliOptions {
  projectRoot: string;
  failOnBlockers?: boolean;
  maxCritical?: number;
  maxHigh?: number;
  minScore?: number;
  baseline?: string;
  format?: 'sarif' | 'json' | 'text';
  output?: string;
  json?: boolean;
}

export async function runCiCommand(options: CiCommandCliOptions): Promise<CiEvaluationResult> {
  const projectRoot = path.resolve(options.projectRoot);

  // 1. Ensure project files are scanned
  await runScanCommand({ projectRoot });

  // 2. Run rules audit
  const auditResult = await runAuditCommand({ projectRoot });

  // 3. Evaluate CI thresholds
  const ciResult = evaluateCiThresholds(auditResult.findings, {
    failOnBlockers: options.failOnBlockers ?? true,
    maxCritical: options.maxCritical,
    maxHigh: options.maxHigh,
    minScore: options.minScore,
    baselineCommit: options.baseline,
  });

  // 4. Handle SARIF export if requested
  if (options.format === 'sarif' || (options.output && options.output.endsWith('.sarif'))) {
    const sarifLog = serializeToSarifLog(auditResult.findings);
    const sarifJson = JSON.stringify(sarifLog, null, 2);

    if (options.output) {
      const outPath = path.resolve(projectRoot, options.output);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, sarifJson, 'utf-8');
      (ciResult as any).sarifPath = outPath;
    }
  }

  // 5. Output to GitHub Step Summary if running in GitHub Actions
  const stepSummaryEnv = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummaryEnv) {
    try {
      fs.appendFileSync(stepSummaryEnv, ciResult.markdownSummary + '\n', 'utf-8');
    } catch {
      // Ignore step summary write error
    }
  }

  return ciResult;
}

