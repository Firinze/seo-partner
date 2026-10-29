/**
 * Contract: Google Search Console Interactive Onboarding & Connector
 * Implements resilient loopback server, port fallback, and persistent refresh tokens.
 */

export interface GscCredentials {
  authType: 'oauth' | 'service_account';
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  clientEmail?: string;
  siteUrl: string;
}

export interface GscSyncSummary {
  siteUrl: string;
  startDate: string;
  endDate: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topQueries: {
    query: string;
    clicks: number;
    impressions: number;
    position: number;
  }[];
}

export interface IGscConnectorService {
  /**
   * Starts the interactive OAuth flow on dedicated port 51842 with dynamic fallback.
   */
  startInteractiveAuth(options?: { preferredPort?: number }): Promise<{
    authUrl: string;
    allocatedPort: number;
    completionPromise: Promise<GscCredentials>;
  }>;

  /**
   * Loads cached credentials and refreshes token transparently if expired.
   */
  getValidCredentials(): Promise<GscCredentials | null>;

  /**
   * Fetches the last 90 days of search analytics metrics.
   */
  fetchSearchMetrics(siteUrl: string): Promise<GscSyncSummary>;
}

