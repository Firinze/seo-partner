import type {
  ApiResponseEnvelope,
  CodeVsCrawlComparisonRow,
  CrawlRun,
  DashboardOverview,
  DecisionRecord,
  ExtractedRouteData,
  Finding,
  FtsSearchResult,
  OwnerRole,
  PrioritizedAction,
  ReportFormat,
  ReportType,
  RuleCategory,
  SeverityLevel,
  SupportedLanguage,
  TargetTimeframe,
} from '@seo-partner/core';

export interface DashboardHttpClientOptions {
  readonly baseUrl: string;
  readonly fetcher?: typeof fetch;
  readonly onUnauthorized?: (status: 401 | 403, endpoint: string) => void;
}

export class DashboardApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly onUnauthorized?: (status: 401 | 403, endpoint: string) => void;

  public constructor(options: DashboardHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetcher = options.fetcher ?? globalThis.fetch;
    this.onUnauthorized = options.onUnauthorized;
  }

  public async request<T>(
    endpoint: string,
    init?: RequestInit,
  ): Promise<ApiResponseEnvelope<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const res = await this.fetcher(url, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (res.status === 401 || res.status === 403) {
      this.onUnauthorized?.(res.status, endpoint);
    }

    const payload = (await res.json()) as ApiResponseEnvelope<T>;
    return payload;
  }

  public async initSession(): Promise<
    ApiResponseEnvelope<{ authenticated: boolean; lang: SupportedLanguage }>
  > {
    return this.request('/api/v1/session', { method: 'GET' });
  }

  public async getOverview(): Promise<ApiResponseEnvelope<DashboardOverview>> {
    return this.request('/api/v1/overview', { method: 'GET' });
  }

  public async getRoutes(): Promise<
    ApiResponseEnvelope<{ routes: ReadonlyArray<ExtractedRouteData>; total: number }>
  > {
    return this.request('/api/v1/routes', { method: 'GET' });
  }

  public async searchFts(
    query: string,
    limit = 20,
  ): Promise<
    ApiResponseEnvelope<{
      query: string;
      results: ReadonlyArray<FtsSearchResult>;
      durationMs: number;
    }>
  > {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return this.request(`/api/v1/search?${params.toString()}`, { method: 'GET' });
  }

  public async getFindings(filters?: {
    category?: RuleCategory;
    severity?: SeverityLevel;
    blocksIndexing?: boolean;
  }): Promise<ApiResponseEnvelope<{ findings: ReadonlyArray<Finding>; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.severity) params.set('severity', filters.severity);
    if (filters?.blocksIndexing !== undefined) {
      params.set('blocksIndexing', String(filters.blocksIndexing));
    }
    const qs = params.toString();
    return this.request(`/api/v1/findings${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }

  public async getBacklog(filters?: {
    ownerRole?: OwnerRole;
    targetTimeframe?: TargetTimeframe;
  }): Promise<
    ApiResponseEnvelope<{ actions: ReadonlyArray<PrioritizedAction>; total: number }>
  > {
    const params = new URLSearchParams();
    if (filters?.ownerRole) params.set('ownerRole', filters.ownerRole);
    if (filters?.targetTimeframe) params.set('targetTimeframe', filters.targetTimeframe);
    const qs = params.toString();
    return this.request(`/api/v1/backlog${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }

  public async getCrawlComparison(crawlRunId?: string): Promise<
    ApiResponseEnvelope<{
      crawlRun: CrawlRun | null;
      rows: ReadonlyArray<CodeVsCrawlComparisonRow>;
    }>
  > {
    const qs = crawlRunId ? `?crawlRunId=${encodeURIComponent(crawlRunId)}` : '';
    return this.request(`/api/v1/crawls/latest/compare${qs}`, { method: 'GET' });
  }

  public async triggerCrawl(payload: {
    startUrl: string;
    allowLocal?: boolean;
    maxPages?: number;
  }): Promise<ApiResponseEnvelope<unknown>> {
    return this.request('/api/v1/crawls', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async createDecision(payload: {
    title: string;
    rationale: string;
    findingId?: string;
  }): Promise<ApiResponseEnvelope<{ decision: DecisionRecord }>> {
    return this.request('/api/v1/decisions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async exportReport(payload: {
    format: ReportFormat;
    reportType?: ReportType;
    lang?: SupportedLanguage;
  }): Promise<ApiResponseEnvelope<{ filePath: string; content: string }>> {
    return this.request('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

