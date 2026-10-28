import crypto from 'node:crypto';
import type { CwvMetricRecord } from '@seo-partner/core';
import { evaluateCwvThreshold } from './evaluator.js';

export interface PageSpeedFetchOptions {
  readonly projectId: string;
  readonly url: string;
  readonly strategy?: 'mobile' | 'desktop';
  readonly apiKey?: string;
  readonly fetchFn?: typeof fetch;
}

export class PageSpeedClient {
  private readonly apiKey?: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: { apiKey?: string; fetchFn?: typeof fetch }) {
    this.apiKey = options?.apiKey ?? process.env['PAGESPEED_API_KEY'] ?? process.env['GOOGLE_API_KEY'];
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  async fetchMetrics(options: PageSpeedFetchOptions): Promise<CwvMetricRecord | null> {
    const strategy = options.strategy ?? 'mobile';
    const formFactor: 'PHONE' | 'DESKTOP' = strategy === 'desktop' ? 'DESKTOP' : 'PHONE';

    let endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(options.url)}&strategy=${strategy}`;
    if (this.apiKey) {
      endpoint += `&key=${encodeURIComponent(this.apiKey)}`;
    }

    try {
      const res = await this.fetchFn(endpoint);
      if (!res.ok) {
        return null;
      }

      const json = (await res.json()) as any;
      const exp = json.loadingExperience?.metrics ? json.loadingExperience : json.originLoadingExperience;
      if (!exp || !exp.metrics) {
        return null;
      }

      const scope: 'url' | 'origin' = json.loadingExperience?.metrics ? 'url' : 'origin';
      const m = exp.metrics;

      const lcpVal = m.LARGEST_CONTENTFUL_PAINT_MS?.percentile != null
        ? Number(m.LARGEST_CONTENTFUL_PAINT_MS.percentile)
        : null;

      const inpVal = m.INTERACTION_TO_NEXT_PAINT?.percentile != null
        ? Number(m.INTERACTION_TO_NEXT_PAINT.percentile)
        : null;

      // PSI returns CLS score as whole number (e.g. 18 for 0.18) or decimal
      let clsVal: number | null = null;
      if (m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null) {
        const raw = Number(m.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile);
        clsVal = raw > 1 ? raw / 100 : raw;
      }

      const fcpVal = m.FIRST_CONTENTFUL_PAINT_MS?.percentile != null
        ? Number(m.FIRST_CONTENTFUL_PAINT_MS.percentile)
        : null;

      const ttfbVal = m.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile != null
        ? Number(m.EXPERIMENTAL_TIME_TO_FIRST_BYTE.percentile)
        : null;

      const now = new Date();
      const fetchedAt = now.toISOString();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      return {
        id: crypto.randomUUID(),
        projectId: options.projectId,
        url: options.url,
        formFactor,
        scope,
        lcpMs: lcpVal,
        lcpRating: lcpVal != null ? evaluateCwvThreshold('LCP', lcpVal) : null,
        inpMs: inpVal,
        inpRating: inpVal != null ? evaluateCwvThreshold('INP', inpVal) : null,
        clsScore: clsVal,
        clsRating: clsVal != null ? evaluateCwvThreshold('CLS', clsVal) : null,
        fcpMs: fcpVal,
        fcpRating: fcpVal != null ? evaluateCwvThreshold('FCP', fcpVal) : null,
        ttfbMs: ttfbVal,
        ttfbRating: ttfbVal != null ? evaluateCwvThreshold('TTFB', ttfbVal) : null,
        fetchedAt,
        expiresAt,
      };
    } catch {
      return null;
    }
  }
}
