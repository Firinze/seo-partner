import crypto from 'node:crypto';
import type { CwvMetricRecord } from '@seo-partner/core';
import { evaluateCwvThreshold } from './evaluator.js';

export interface CruxFetchOptions {
  readonly projectId: string;
  readonly url: string;
  readonly formFactor?: 'PHONE' | 'DESKTOP' | 'ALL';
  readonly apiKey?: string;
  readonly fetchFn?: typeof fetch;
}

export class CruxClient {
  private readonly apiKey?: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: { apiKey?: string; fetchFn?: typeof fetch }) {
    this.apiKey = options?.apiKey ?? process.env['CRUX_API_KEY'] ?? process.env['GOOGLE_API_KEY'];
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  async fetchMetrics(options: CruxFetchOptions): Promise<CwvMetricRecord[]> {
    const formFactors: Array<'PHONE' | 'DESKTOP'> =
      !options.formFactor || options.formFactor === 'ALL'
        ? ['PHONE', 'DESKTOP']
        : [options.formFactor];

    const records: CwvMetricRecord[] = [];

    for (const ff of formFactors) {
      const record = await this.queryWithFallback(options.projectId, options.url, ff);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  private async queryWithFallback(
    projectId: string,
    url: string,
    formFactor: 'PHONE' | 'DESKTOP',
  ): Promise<CwvMetricRecord | null> {
    // 1. Try URL-level
    const urlData = await this.executeCruxQuery({ url, formFactor });
    if (urlData && urlData.record && urlData.record.metrics) {
      return this.mapToRecord(projectId, url, formFactor, 'url', urlData.record.metrics);
    }

    // 2. Try Origin fallback
    try {
      const origin = new URL(url).origin;
      const originData = await this.executeCruxQuery({ origin, formFactor });
      if (originData && originData.record && originData.record.metrics) {
        return this.mapToRecord(projectId, url, formFactor, 'origin', originData.record.metrics);
      }
    } catch {
      // Invalid URL or origin query failed
    }

    return null;
  }

  private async executeCruxQuery(
    body: { url?: string; origin?: string; formFactor: 'PHONE' | 'DESKTOP' },
  ): Promise<any> {
    let endpoint = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
    if (this.apiKey) {
      endpoint += `?key=${encodeURIComponent(this.apiKey)}`;
    }

    try {
      const res = await this.fetchFn(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        return null;
      }

      return await res.json();
    } catch {
      return null;
    }
  }

  private mapToRecord(
    projectId: string,
    url: string,
    formFactor: 'PHONE' | 'DESKTOP',
    scope: 'url' | 'origin',
    metrics: Record<string, any>,
  ): CwvMetricRecord {
    const lcpVal = metrics['largest_contentful_paint']?.percentiles?.p75 != null
      ? Number(metrics['largest_contentful_paint'].percentiles.p75)
      : null;

    const inpVal = metrics['interaction_to_next_paint']?.percentiles?.p75 != null
      ? Number(metrics['interaction_to_next_paint'].percentiles.p75)
      : null;

    const clsRaw = metrics['cumulative_layout_shift']?.percentiles?.p75;
    const clsVal = clsRaw != null ? parseFloat(String(clsRaw)) : null;

    const fcpVal = metrics['first_contentful_paint']?.percentiles?.p75 != null
      ? Number(metrics['first_contentful_paint'].percentiles.p75)
      : null;

    const ttfbVal = metrics['experimental_time_to_first_byte']?.percentiles?.p75 != null
      ? Number(metrics['experimental_time_to_first_byte'].percentiles.p75)
      : null;

    const now = new Date();
    const fetchedAt = now.toISOString();
    // Default TTL: 7 days
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: crypto.randomUUID(),
      projectId,
      url,
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
  }
}

