import type { Finding, SarifLog, SarifResult, SarifRuleDefinition } from '@seo-partner/core';

export interface SarifSerializerOptions {
  version?: string;
}

export function serializeToSarifLog(
  findings: ReadonlyArray<Finding>,
  options: SarifSerializerOptions = {},
): SarifLog {
  const version = options.version ?? '0.7.0';

  const rulesMap = new Map<string, SarifRuleDefinition>();
  const results: SarifResult[] = [];

  for (const finding of findings) {
    if (!rulesMap.has(finding.ruleId)) {
      const defaultLevel =
        finding.severity === 'critical' || finding.severity === 'high'
          ? 'error'
          : finding.severity === 'medium'
            ? 'warning'
            : 'note';

      rulesMap.set(finding.ruleId, {
        id: finding.ruleId,
        name: finding.ruleId.replace(/-/g, '_'),
        shortDescription: { text: finding.remediation?.en || finding.ruleId },
        helpUri: `https://github.com/Firinze/seo-partner#rules-${finding.ruleId.toLowerCase()}`,
        defaultConfiguration: {
          level: defaultLevel,
        },
      });
    }

    const level: 'error' | 'warning' | 'note' =
      finding.severity === 'critical' || finding.severity === 'high'
        ? 'error'
        : finding.severity === 'medium'
          ? 'warning'
          : 'note';

    const uri = finding.evidence.filePath
      ? finding.evidence.filePath.replace(/\\/g, '/')
      : finding.evidence.url ?? 'unknown';

    const startLine = finding.evidence.lineNumber > 0 ? finding.evidence.lineNumber : 1;

    results.push({
      ruleId: finding.ruleId,
      level,
      message: {
        text: finding.remediation?.en || finding.evidence.observed,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri },
            region: {
              startLine,
              startColumn: 1,
            },
          },
        },
      ],
      properties: {
        category: finding.category,
        severity: finding.severity,
        blocksIndexing: finding.blocksIndexing,
        iceScore: finding.ice.score,
      },
    });
  }

  return {
    $schema: 'https://docs.oasis-open.org/sarif/sarif/v2.1.0/cos01/schemas/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'seo-partner',
            semanticVersion: version,
            informationUri: 'https://github.com/Firinze/seo-partner',
            rules: Array.from(rulesMap.values()),
          },
        },
        results,
      },
    ],
  };
}

