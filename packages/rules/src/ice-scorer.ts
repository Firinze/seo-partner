import crypto from 'node:crypto';
import type {
  Finding,
  FindingEvidence,
  IceBreakdown,
  PrioritizedAction,
  RuleDefinition,
} from '@seo-partner/core';

export function calculateIceScore(
  impact: number,
  confidence: number,
  effort: number,
): number {
  const clampedImpact = Math.min(10, Math.max(1, impact));
  const clampedConfidence = Math.min(10, Math.max(1, confidence));
  const clampedEffort = Math.min(10, Math.max(1, effort));
  return Math.round(((clampedImpact + clampedConfidence + clampedEffort) / 3) * 100) / 100;
}

export function buildIceBreakdown(
  impact: number,
  confidence: number,
  effort: number,
  rationale: { readonly en: string; readonly fr: string },
): IceBreakdown {
  return {
    impact,
    confidence,
    effort,
    score: calculateIceScore(impact, confidence, effort),
    rationale,
  };
}

export function createDeterministicFindingId(ruleId: string, subjectRef: string): string {
  const digest = crypto
    .createHash('sha256')
    .update(`${ruleId}:${subjectRef}`)
    .digest('hex')
    .slice(0, 12);
  return `f_${digest}`;
}

export function createFindingFromRule(
  rule: RuleDefinition,
  params: {
    subjectRef: string;
    evidence: FindingEvidence;
    remediation: { readonly en: string; readonly fr: string };
    customIce?: {
      impact: number;
      confidence: number;
      effort: number;
      rationale?: { readonly en: string; readonly fr: string };
    };
  },
): Finding {
  const now = new Date().toISOString();
  const iceSource = params.customIce ?? rule.defaultIce;
  const ice = buildIceBreakdown(
    iceSource.impact,
    iceSource.confidence,
    iceSource.effort,
    iceSource.rationale ?? rule.defaultIce.rationale,
  );

  return {
    id: createDeterministicFindingId(rule.id, params.subjectRef),
    ruleId: rule.id,
    category: rule.category,
    severity: rule.defaultSeverity,
    blocksIndexing: rule.blocksIndexing,
    subjectRef: params.subjectRef,
    evidence: {
      ...params.evidence,
      lineNumber: Math.max(1, params.evidence.lineNumber),
    },
    ice,
    remediation: params.remediation,
    ownerRole: rule.ownerRole,
    targetTimeframe: rule.targetTimeframe,
    kpi: rule.kpi,
    officialSourceUrl: rule.officialSourceUrl,
    status: 'open',
    firstSeenAt: now,
    lastSeenAt: now,
    resolvedAt: null,
  };
}

export function compareByIndexingPriorityAndIce<
  T extends {
    readonly blocksIndexing: boolean;
    readonly ice: IceBreakdown;
  },
>(a: T, b: T): number {
  if (a.blocksIndexing !== b.blocksIndexing) {
    return a.blocksIndexing ? -1 : 1;
  }
  if (b.ice.score !== a.ice.score) {
    return b.ice.score - a.ice.score;
  }
  if (b.ice.impact !== a.ice.impact) {
    return b.ice.impact - a.ice.impact;
  }
  return b.ice.effort - a.ice.effort;
}

export function sortFindingsByPriority(
  findings: ReadonlyArray<Finding>,
): ReadonlyArray<Finding> {
  return [...findings].sort(compareByIndexingPriorityAndIce);
}

export function sortActionsByPriority(
  actions: ReadonlyArray<PrioritizedAction>,
): ReadonlyArray<PrioritizedAction> {
  return [...actions].sort(compareByIndexingPriorityAndIce);
}

