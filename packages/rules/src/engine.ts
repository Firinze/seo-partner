import type { Finding, RuleDefinition } from '@seo-partner/core';
import {
  evaluateTechnicalRules,
  TECHNICAL_RULES,
  type AuditContext,
} from './catalog/technical-rules.js';
import {
  evaluateOnPageRules,
  ONPAGE_RULES,
} from './catalog/onpage-rules.js';
import {
  evaluateSchemaRules,
  SCHEMA_RULES,
} from './catalog/schema-rules.js';
import { sortFindingsByPriority } from './ice-scorer.js';

export const ALL_V01_RULES: ReadonlyArray<RuleDefinition> = [
  ...TECHNICAL_RULES,
  ...ONPAGE_RULES,
  ...SCHEMA_RULES,
];

export function runRulesEngine(ctx: AuditContext): ReadonlyArray<Finding> {
  const findings: Finding[] = [
    ...evaluateTechnicalRules(ctx),
    ...evaluateOnPageRules(ctx.routes),
    ...evaluateSchemaRules(ctx.routes),
  ];

  return sortFindingsByPriority(findings);
}

