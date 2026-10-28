import { describe, expect, it } from 'vitest';
import {
  buildIceBreakdown,
  calculateIceScore,
  sortFindingsByPriority,
  RULE_ONPAGE_03,
  RULE_TECH_03,
  createFindingFromRule,
} from '@seo-partner/rules';

describe('US3: ICE Score Calculation & Indexing Blocker Priority Rule (F-R3)', () => {
  it('computes ICE = (Impact + Confidence + Effort) / 3 rounded to 2 decimals', () => {
    expect(calculateIceScore(10, 10, 10)).toBe(10);
    expect(calculateIceScore(9, 8, 8)).toBe(8.33);
    const breakdown = buildIceBreakdown(8, 9, 7, { en: 'reason', fr: 'raison' });
    expect(breakdown.score).toBe(8);
  });

  it('always places indexing blockers ahead of non-blocking findings even if the non-blocker has a higher ICE score', () => {
    const nonBlockingHighIce = createFindingFromRule(RULE_ONPAGE_03, {
      subjectRef: '/blog',
      evidence: {
        source: 'code-scan',
        filePath: 'src/app/blog/page.tsx',
        lineNumber: 5,
        observed: 'short title',
        expected: '50-60 chars',
      },
      remediation: { en: 'Fix title', fr: 'Corriger title' },
      customIce: { impact: 10, confidence: 10, effort: 10 },
    });

    const blockingLowerIce = createFindingFromRule(RULE_TECH_03, {
      subjectRef: '/pricing',
      evidence: {
        source: 'code-scan',
        filePath: 'src/app/pricing/page.tsx',
        lineNumber: 7,
        observed: 'noindex',
        expected: 'index',
      },
      remediation: { en: 'Remove noindex', fr: 'Retirer noindex' },
      customIce: { impact: 5, confidence: 5, effort: 5 },
    });

    const sorted = sortFindingsByPriority([nonBlockingHighIce, blockingLowerIce]);
    expect(sorted[0]?.ruleId).toBe('R-TECH-03');
    expect(sorted[0]?.blocksIndexing).toBe(true);
    expect(sorted[1]?.ruleId).toBe('R-ONPAGE-03');
  });
});

