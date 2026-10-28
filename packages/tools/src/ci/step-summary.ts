import type { CiEvaluationResult } from '@seo-partner/core';

export function formatStepSummaryMarkdown(result: CiEvaluationResult): string {
  const statusLabel = result.passed ? 'PASSED' : 'FAILED';
  const lines: string[] = [];

  lines.push(`# SEO CI/CD Compliance Report — ${statusLabel}`);
  lines.push('');
  lines.push(`- **Evaluated At**: ${result.evaluatedAt}`);
  lines.push(`- **Exit Code**: ${result.exitCode}`);
  lines.push(`- **Total Findings**: ${result.totalFindings}`);
  lines.push(`- **Blocking Indexing Issues**: ${result.blockingIndexingCount}`);
  lines.push(
    `- **Severity Breakdown**: Critical: ${result.criticalCount} | High: ${result.highCount} | Medium: ${result.mediumCount} | Low: ${result.lowCount}`,
  );

  if (result.thresholdsViolated.length > 0) {
    lines.push('');
    lines.push('### Threshold Violations');
    for (const v of result.thresholdsViolated) {
      lines.push(`- [VIOLATION] ${v}`);
    }
  }

  if (result.findings.length > 0) {
    lines.push('');
    lines.push('### Priority Findings (ICE Scored, Blockers First)');
    lines.push('');
    lines.push('| Rule | Category | Severity | Location | Block? | ICE | Message |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

    for (const f of result.findings.slice(0, 30)) {
      const loc = f.filePath ? `${f.filePath}:${f.lineNumber ?? 1}` : 'N/A';
      const blocker = f.blocksIndexing ? 'YES' : 'NO';
      lines.push(
        `| ${f.ruleId} | ${f.category} | ${f.severity.toUpperCase()} | ${loc} | ${blocker} | ${f.iceScore.toFixed(2)} | ${f.message.replace(/\|/g, '\\|')} |`,
      );
    }

    if (result.findings.length > 30) {
      lines.push('');
      lines.push(`*... and ${result.findings.length - 30} more findings.*`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('*Generated deterministically by seo-partner ci. Zero hallucination, zero target code execution.*');

  return lines.join('\n');
}

