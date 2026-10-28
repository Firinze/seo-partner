import type { ExtractedRouteData, Finding, RuleDefinition } from '@seo-partner/core';
import { createFindingFromRule } from '../ice-scorer.js';

export const RULE_SCHEMA_01: RuleDefinition = {
  id: 'R-SCHEMA-01',
  category: 'schema',
  defaultSeverity: 'high',
  blocksIndexing: false,
  officialSourceUrl:
    'https://developers.google.com/search/docs/appearance/structured-data/sd-policies',
  title: {
    en: 'Valid and compliant JSON-LD structured data',
    fr: 'Validité syntaxique et conformité des données structurées JSON-LD',
  },
  defaultIce: {
    impact: 8,
    confidence: 9,
    effort: 8,
    rationale: {
      en: 'Invalid JSON-LD prevents Rich Results eligibility and entity disambiguation.',
      fr: 'Un JSON-LD invalide bloque l éligibilité aux résultats enrichis et la compréhension d entité.',
    },
  },
  ownerRole: 'dev',
  targetTimeframe: '30-days',
  kpi: {
    en: '100% valid JSON-LD items in Rich Results Test',
    fr: '100 % des blocs JSON-LD valides au Test des résultats enrichis',
  },
};

export const SCHEMA_RULES: ReadonlyArray<RuleDefinition> = [RULE_SCHEMA_01];

export function evaluateSchemaRules(
  routes: ReadonlyArray<ExtractedRouteData>,
): ReadonlyArray<Finding> {
  const findings: Finding[] = [];

  for (const item of routes) {
    if (item.route.isPrivate) continue;
    for (const schema of item.jsonLdItems) {
      if (!schema.isValid) {
        findings.push(
          createFindingFromRule(RULE_SCHEMA_01, {
            subjectRef: `${item.route.pattern}#jsonld:${schema.line}`,
            evidence: {
              source: 'code-scan',
              filePath: item.route.filePath,
              lineNumber: schema.line,
              observed: schema.validationError ?? 'Invalid JSON-LD block',
              expected: 'Valid JSON-LD containing "@context": "https://schema.org" and "@type"',
            },
            remediation: {
              en: `Fix the JSON-LD structured data in ${item.route.filePath}:${schema.line} (${schema.validationError ?? 'invalid schema'}).`,
              fr: `Corriger le bloc JSON-LD dans ${item.route.filePath}:${schema.line} (${schema.validationError ?? 'schéma invalide'}).`,
            },
          }),
        );
      }
    }
  }

  return findings;
}

