import type { CwvRating } from '@seo-partner/core';

export type CwvMetricName = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

export interface CwvThresholdDef {
  readonly good: number;
  readonly needsImprovement: number;
}

export const CWV_THRESHOLDS: Record<CwvMetricName, CwvThresholdDef> = {
  LCP: { good: 2500, needsImprovement: 4000 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

/**
 * Evaluate metric value against standard Google Web Vitals thresholds.
 */
export function evaluateCwvThreshold(metric: CwvMetricName, value: number): CwvRating {
  const threshold = CWV_THRESHOLDS[metric];
  if (!threshold) {
    return 'good';
  }

  if (value <= threshold.good) {
    return 'good';
  }
  if (value <= threshold.needsImprovement) {
    return 'needs-improvement';
  }
  return 'poor';
}

