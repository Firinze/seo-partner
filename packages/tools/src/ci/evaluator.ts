import type {
  Finding,
  CiThresholds,
  CiEvaluationResult,
  CiFindingSummary,
} from '@seo-partner/core';
import { formatStepSummaryMarkdown } from './step-summary.js';

export function evaluateCiThresholds(
  findings: ReadonlyArray<Finding>,
  thresholds: CiThresholds = {},
): CiEvaluationResult {
  const failOnBlockers = thresholds.failOnBlockers ?? true;
  const maxCritical = thresholds.maxCritical ?? 0;
  const maxHigh = thresholds.maxHigh;
  const minScore = thresholds.minScore;

  let blockingCount = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  let totalIceScore = 0;

  const findingSummaries: CiFindingSummary[] = [];

  for (const f of findings) {
    if (f.blocksIndexing) blockingCount++;
    if (f.severity === 'critical') criticalCount++;
    else if (f.severity === 'high') highCount++;
    else if (f.severity === 'medium') mediumCount++;
    else if (f.severity === 'low') lowCount++;

    totalIceScore += f.ice.score;

    findingSummaries.push({
      ruleId: f.ruleId,
      ruleTitle: f.ruleId,
      severity: f.severity,
      category: f.category,
      blocksIndexing: f.blocksIndexing,
      iceScore: f.ice.score,
      filePath: f.evidence.filePath,
      lineNumber: f.evidence.lineNumber,
      message: f.remediation?.en || f.evidence.observed,
    });
  }

  // Sort findings: blockers first, then descending ICE score (Principle V / F-R3)
  findingSummaries.sort((a, b) => {
    if (a.blocksIndexing !== b.blocksIndexing) {
      return a.blocksIndexing ? -1 : 1;
    }
    return b.iceScore - a.iceScore;
  });

  const avgIceScore = findings.length > 0 ? totalIceScore / findings.length : 10;
  const thresholdsViolated: string[] = [];

  if (failOnBlockers && blockingCount > 0) {
    thresholdsViolated.push(`failOnBlockers (${blockingCount} blocking issues found)`);
  }

  if (maxCritical !== undefined && criticalCount > maxCritical) {
    thresholdsViolated.push(`maxCritical exceeded (${criticalCount} > ${maxCritical})`);
  }

  if (maxHigh !== undefined && highCount > maxHigh) {
    thresholdsViolated.push(`maxHigh exceeded (${highCount} > ${maxHigh})`);
  }

  if (minScore !== undefined && avgIceScore < minScore) {
    thresholdsViolated.push(`minScore not met (average ICE ${avgIceScore.toFixed(2)} < ${minScore})`);
  }

  const passed = thresholdsViolated.length === 0;
  const exitCode = passed ? 0 : 1;

  const result: CiEvaluationResult = {
    passed,
    exitCode,
    evaluatedAt: new Date().toISOString(),
    totalFindings: findings.length,
    blockingIndexingCount: blockingCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    thresholdsViolated,
    findings: findingSummaries,
    markdownSummary: '',
  };

  const markdownSummary = formatStepSummaryMarkdown(result);

  return {
    ...result,
    markdownSummary,
  };
}

export function generateStepSummaryMarkdown(result: CiEvaluationResult): string {
  return formatStepSummaryMarkdown(result);
}

