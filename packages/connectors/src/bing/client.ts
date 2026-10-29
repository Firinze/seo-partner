import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { BingPerformanceRecord, BingInspectionRecord } from '@seo-partner/core';

export interface BingWebmasterClientOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly fetchFn?: typeof fetch;
  readonly projectRoot?: string;
}

interface RawBingQueryStatsItem {
  readonly Query?: string;
  readonly Clicks?: number;
  readonly Impressions?: number;
  readonly AvgClickPosition?: number;
  readonly AvgImpressionPosition?: number;
  readonly Date?: string;
}

interface RawBingInspectionData {
  readonly Url?: string;
  readonly IsIndexed?: boolean;
  readonly HttpCode?: number;
  readonly LastCrawledDate?: string;
  readonly CrawlState?: string;
  readonly IndexingState?: string;
}

export class BingWebmasterClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly projectRoot: string;

  public constructor(options?: BingWebmasterClientOptions) {
    this.apiKey = options?.apiKey;
    this.baseUrl = options?.baseUrl ?? 'https://ssl.bing.com/webmaster/api.svc/json';
    this.fetchFn = options?.fetchFn ?? globalThis.fetch;
    this.projectRoot = options?.projectRoot ?? process.cwd();
  }

  public getApiKey(): string | null {
    if (this.apiKey) {
      return this.apiKey;
    }

    if (process.env.BING_API_KEY) {
      return process.env.BING_API_KEY;
    }

    const credentialsPath = path.resolve(this.projectRoot, '.seo/credentials-bing.json');
    if (fs.existsSync(credentialsPath)) {
      try {
        const raw = fs.readFileSync(credentialsPath, 'utf8');
        const parsed = JSON.parse(raw) as { apiKey?: string; api_key?: string };
        const key = parsed.apiKey ?? parsed.api_key;
        if (key) return key;
      } catch {
        // Ignorer les erreurs de lecture de credentials
      }
    }

    return null;
  }

  public async getQueryStats(
    siteUrl: string,
    options?: { page?: number; pageSize?: number; projectId?: string },
  ): Promise<ReadonlyArray<BingPerformanceRecord>> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Bing API key is required. Provide it via options, BING_API_KEY env, or .seo/credentials-bing.json');
    }

    const url = `${this.baseUrl}/GetQueryStats?apikey=${encodeURIComponent(apiKey)}`;
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: JSON.stringify({ siteUrl }),
    });

    if (!response.ok) {
      throw new Error(`Bing API GetQueryStats failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { d?: ReadonlyArray<RawBingQueryStatsItem> };
    const rawList = payload.d ?? [];

    const now = new Date();
    const fetchedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const projectId = options?.projectId ?? 'default';

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '';
    const today = now.toISOString().split('T')[0] ?? '';

    return rawList.map((item, index) => {
      const clicks = Number(item.Clicks ?? 0);
      const impressions = Number(item.Impressions ?? 0);
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const position = Number(item.AvgClickPosition ?? item.AvgImpressionPosition ?? 0);
      const query = item.Query ?? '';

      return {
        id: crypto.createHash('sha256').update(`${projectId}:${siteUrl}:${query}:${index}`).digest('hex').slice(0, 16),
        projectId,
        url: siteUrl,
        query,
        clicks,
        impressions,
        ctr,
        position,
        dateStart: thirtyDaysAgo,
        dateEnd: today,
        fetchedAt,
        expiresAt,
      };
    });
  }

  public async inspectUrl(
    url: string,
    siteUrl?: string,
    projectId?: string,
  ): Promise<BingInspectionRecord> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Bing API key is required. Provide it via options, BING_API_KEY env, or .seo/credentials-bing.json');
    }

    const requestUrl = `${this.baseUrl}/GetUrlTrafficStats?apikey=${encodeURIComponent(apiKey)}`;
    const response = await this.fetchFn(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: JSON.stringify({ url, siteUrl: siteUrl ?? url }),
    });

    if (!response.ok) {
      throw new Error(`Bing API inspectUrl failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { d?: RawBingInspectionData };
    const data = payload.d ?? {};

    const now = new Date();
    const fetchedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const projId = projectId ?? 'default';

    let verdict: BingInspectionRecord['verdict'] = 'UNKNOWN';
    if (data.IsIndexed === true || data.IndexingState === 'INDEXED') {
      verdict = 'INDEXED';
    } else if (data.IndexingState === 'BLOCKED' || data.CrawlState === 'BLOCKED') {
      verdict = 'BLOCKED';
    } else if (data.IndexingState === 'EXCLUDED' || data.CrawlState === 'EXCLUDED') {
      verdict = 'EXCLUDED';
    }

    let lastCrawlTime: string | null = null;
    if (data.LastCrawledDate) {
      const match = /\/Date\((\d+)\)\//.exec(data.LastCrawledDate);
      if (match?.[1]) {
        lastCrawlTime = new Date(Number(match[1])).toISOString();
      } else {
        lastCrawlTime = data.LastCrawledDate;
      }
    }

    return {
      id: crypto.createHash('sha256').update(`${projId}:${url}`).digest('hex').slice(0, 16),
      projectId: projId,
      url,
      verdict,
      indexingState: data.IndexingState ?? (data.IsIndexed ? 'INDEXED' : 'UNKNOWN'),
      crawlState: data.CrawlState ?? 'UNKNOWN',
      lastCrawlTime,
      httpCode: Number(data.HttpCode ?? 200),
      fetchedAt,
      expiresAt,
    };
  }
}

