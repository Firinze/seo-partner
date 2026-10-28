import crypto from 'node:crypto';
import type { GscInspectionRecord } from '@seo-partner/core';
import type { GscAuthenticator } from './auth.js';

export interface GscInspectOptions {
  siteUrl: string;
  inspectionUrl: string;
  projectId: string;
  languageCode?: string;
}

export interface GscIndexStatusResult {
  verdict?: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL';
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  userCanonical?: string;
  googleCanonical?: string;
}

export interface GscInspectionApiResponse {
  inspectionResult?: {
    verdict?: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL';
    indexStatusResult?: GscIndexStatusResult;
  };
}

export class GscInspector {
  public constructor(
    private readonly authenticator: GscAuthenticator,
    private readonly baseUrl: string = 'https://searchconsole.googleapis.com',
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  public async inspectUrl(options: GscInspectOptions): Promise<GscInspectionRecord> {
    const token = await this.authenticator.getAccessToken();

    const endpoint = `${this.baseUrl}/v1/urlInspection/index:inspect`;
    const body = {
      siteUrl: options.siteUrl,
      inspectionUrl: options.inspectionUrl,
      languageCode: options.languageCode ?? 'fr',
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
      throw new Error(`Google URL Inspection Error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as GscInspectionApiResponse;
    const indexResult = data.inspectionResult?.indexStatusResult ?? {};
    const verdict = data.inspectionResult?.verdict ?? 'NEUTRAL';
    const nowIso = new Date().toISOString();

    const idHash = crypto
      .createHash('sha256')
      .update(`${options.projectId}:${options.inspectionUrl}:${nowIso.slice(0, 10)}`)
      .digest('hex')
      .slice(0, 16);

    return {
      id: `gsc_insp_${idHash}`,
      projectId: options.projectId,
      url: options.inspectionUrl,
      verdict: verdict as GscInspectionRecord['verdict'],
      coverageState: indexResult.coverageState ?? 'Unknown',
      indexingState: indexResult.indexingState ?? 'Unknown',
      robotsTxtState: indexResult.robotsTxtState ?? 'Unknown',
      lastCrawlTime: indexResult.lastCrawlTime ?? null,
      pageFetchState: indexResult.pageFetchState ?? null,
      canonicalUser: indexResult.userCanonical ?? null,
      canonicalGoogle: indexResult.googleCanonical ?? null,
      fetchedAt: nowIso,
    };
  }
}

