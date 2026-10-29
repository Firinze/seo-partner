export interface BingPerformanceRecord {
  readonly id: string;
  readonly projectId: string;
  readonly url: string;
  readonly query: string;
  readonly clicks: number;
  readonly impressions: number;
  readonly ctr: number;
  readonly position: number;
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly fetchedAt: string;
  readonly expiresAt: string;
}

export interface BingInspectionRecord {
  readonly id: string;
  readonly projectId: string;
  readonly url: string;
  readonly verdict: 'INDEXED' | 'BLOCKED' | 'EXCLUDED' | 'UNKNOWN';
  readonly indexingState: string;
  readonly crawlState: string;
  readonly lastCrawlTime: string | null;
  readonly httpCode: number;
  readonly fetchedAt: string;
  readonly expiresAt: string;
}

export interface BingSyncResult {
  readonly siteUrl: string;
  readonly rowsSynced: number;
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly fromCache: boolean;
  readonly expiresAt: string;
}

