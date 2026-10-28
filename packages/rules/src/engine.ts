import type { Finding, RuleDefinition } from '@seo-partner/core';
import {
  evaluateTechnicalRules,
  TECHNICAL_RULES,
  TECHNICAL_RULES_V01,
  type AuditContext,
} from './catalog/technical-rules.js';
import {
  evaluateOnPageRules,
  ONPAGE_RULES,
  ONPAGE_RULES_V01,
} from './catalog/onpage-rules.js';
import {
  evaluateSchemaRules,
  SCHEMA_RULES,
  SCHEMA_RULES_V01,
} from './catalog/schema-rules.js';
import {
  evaluateLocalRules,
  LOCAL_RULES,
} from './catalog/local-rules.js';
import {
  evaluateGeoRules,
  GEO_RULES,
} from './catalog/geo-rules.js';
import {
  evaluatePerfRules,
  PERF_RULES,
} from './catalog/perf-rules.js';
import { sortFindingsByPriority } from './ice-scorer.js';

export const ALL_V01_RULES: ReadonlyArray<RuleDefinition> = [
  ...TECHNICAL_RULES_V01,
  ...ONPAGE_RULES_V01,
  ...SCHEMA_RULES_V01,
];

export const ALL_V02_RULES: ReadonlyArray<RuleDefinition> = [
  ...TECHNICAL_RULES,
  ...ONPAGE_RULES,
  ...SCHEMA_RULES,
  ...LOCAL_RULES,
  ...GEO_RULES,
];

export const ALL_V06_RULES: ReadonlyArray<RuleDefinition> = [
  ...ALL_V02_RULES,
  ...PERF_RULES,
];

export const ALL_RULES: ReadonlyArray<RuleDefinition> = ALL_V06_RULES;

export function runRulesEngine(ctx: AuditContext): ReadonlyArray<Finding> {
  const findings: Finding[] = [
    ...evaluateTechnicalRules(ctx),
    ...evaluateOnPageRules(ctx.routes, ctx.crawlPages),
    ...evaluateSchemaRules(ctx.routes),
    ...evaluateLocalRules(ctx.routes),
    ...evaluateGeoRules(ctx),
    ...evaluatePerfRules(ctx.cwvMetrics),
  ];

  return sortFindingsByPriority(findings);
}
