import crypto from 'node:crypto';
import type { GscPerformanceRecord } from '@seo-partner/core';
import type { GscAuthenticator } from './auth.js';

export interface GscQueryOptions {
  siteUrl: string;
  projectId: string;
  startDate?: string;
  endDate?: string;
  days?: number; // default 28
  dimensions?: Array<'page' | 'query' | 'device' | 'country'>;
  rowLimit?: number; // default 1000
}

export interface GscApiRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

export interface GscQueryResponse {
  rows?: GscApiRow[];
  responseAggregationType?: string;
}

export class GscClient {
  public constructor(
    private readonly authenticator: GscAuthenticator,
    private readonly baseUrl: string = 'https://searchconsole.googleapis.com',
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  public async fetchPerformance(options: GscQueryOptions): Promise<ReadonlyArray<GscPerformanceRecord>> {
    const token = await this.authenticator.getAccessToken();

    const endDate = options.endDate ?? this.formatDate(new Date(Date.now() - 2 * 86_400_000)); // GSC lag is 2-3 days
    const days = options.days ?? 28;
    const startDate =
      options.startDate ?? this.formatDate(new Date(new Date(endDate).getTime() - days * 86_400_000));

    const dimensions = options.dimensions ?? ['page', 'query'];
    const rowLimit = options.rowLimit ?? 1000;

    const endpoint = `${this.baseUrl}/webmasters/v3/sites/${encodeURIComponent(options.siteUrl)}/searchAnalytics/query`;

    const body = {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      aggregationType: 'byPage',
    };

    const res = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Search Console Query Error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as GscQueryResponse;
    const rows = data.rows ?? [];
    const nowIso = new Date().toISOString();

    return rows.map((r) => {
      const pageKey = r.keys?.[0] ?? options.siteUrl;
      const queryKey = r.keys?.[1] ?? '';
      const clicks = Number(r.clicks ?? 0);
      const impressions = Number(r.impressions ?? 0);
      const ctr = Number(r.ctr ?? 0);
      const position = Number(r.position ?? 0);

      const idHash = crypto
        .createHash('sha256')
        .update(`${options.projectId}:${pageKey}:${queryKey}:${startDate}:${endDate}`)
        .digest('hex')
        .slice(0, 16);

      return {
        id: `gsc_perf_${idHash}`,
        projectId: options.projectId,
        url: pageKey,
        query: queryKey,
        device: 'all' as const,
        country: 'all',
        clicks,
        impressions,
        ctr,
        position,
        dateStart: startDate,
        dateEnd: endDate,
        fetchedAt: nowIso,
      };
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}

