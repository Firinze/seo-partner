import path from 'node:path';
import type {
  BingPerformanceRecord,
  BingInspectionRecord,
  BingSyncResult,
} from '@seo-partner/core';
import {
  SeoDatabase,
  ProjectRepository,
  BingRepository,
} from '@seo-partner/store';
import { BingWebmasterClient } from '@seo-partner/connectors';
import { computeProjectId } from '../engine/scan.js';

export interface BingSyncOptions {
  readonly projectRoot: string;
  readonly siteUrl: string;
  readonly apiKey?: string;
  readonly force?: boolean;
}

export interface BingInspectOptions {
  readonly projectRoot: string;
  readonly url: string;
  readonly siteUrl?: string;
  readonly apiKey?: string;
  readonly force?: boolean;
}

export interface BingPerformanceSummary {
  readonly siteUrl: string;
  readonly totalClicks: number;
  readonly totalImpressions: number;
  readonly averageCtr: number;
  readonly averagePosition: number;
  readonly rows: ReadonlyArray<BingPerformanceRecord>;
  readonly fromCache: boolean;
  readonly expiresAt: string;
}

export async function runBingSyncCommand(options: BingSyncOptions): Promise<BingSyncResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const store = SeoDatabase.open(projectRoot);

  try {
    const bingRepo = new BingRepository(store);
    const project = new ProjectRepository(store).getLatestProject();
    const projectId = project?.id ?? computeProjectId(projectRoot);

    const isCached = bingRepo.isPerformanceCached(projectId);
    if (isCached && !options.force) {
      const cachedRows = bingRepo.listPerformance(projectId, 1000);
      const cachedExpiresAt = bingRepo.getCachedExpiresAt(projectId) ?? new Date().toISOString();
      return {
        siteUrl: options.siteUrl,
        rowsSynced: cachedRows.length,
        dateStart: cachedRows[0]?.dateStart ?? '',
        dateEnd: cachedRows[0]?.dateEnd ?? '',
        fromCache: true,
        expiresAt: cachedExpiresAt,
      };
    }

    const client = new BingWebmasterClient({
      apiKey: options.apiKey,
      projectRoot,
    });

    const rows = await client.getQueryStats(options.siteUrl, { projectId });
    bingRepo.savePerformanceRows(rows);

    const expiresAt = rows[0]?.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const dateStart = rows[0]?.dateStart ?? '';
    const dateEnd = rows[0]?.dateEnd ?? '';

    return {
      siteUrl: options.siteUrl,
      rowsSynced: rows.length,
      dateStart,
      dateEnd,
      fromCache: false,
      expiresAt,
    };
  } finally {
    store.close();
  }
}

export async function runBingInspectCommand(options: BingInspectOptions): Promise<BingInspectionRecord> {
  const projectRoot = path.resolve(options.projectRoot);
  const store = SeoDatabase.open(projectRoot);

  try {
    const bingRepo = new BingRepository(store);
    const project = new ProjectRepository(store).getLatestProject();
    const projectId = project?.id ?? computeProjectId(projectRoot);

    const cached = bingRepo.getInspection(projectId, options.url);
    if (cached && !options.force && new Date(cached.expiresAt).getTime() > Date.now()) {
      return cached;
    }

    const client = new BingWebmasterClient({
      apiKey: options.apiKey,
      projectRoot,
    });

    const record = await client.inspectUrl(options.url, options.siteUrl, projectId);
    bingRepo.saveInspection(record);

    return record;
  } finally {
    store.close();
  }
}

export async function getBingPerformanceSummary(options: {
  projectRoot: string;
  siteUrl?: string;
  limit?: number;
}): Promise<BingPerformanceSummary> {
  const projectRoot = path.resolve(options.projectRoot);
  const store = SeoDatabase.open(projectRoot);

  try {
    const bingRepo = new BingRepository(store);
    const project = new ProjectRepository(store).getLatestProject();
    const projectId = project?.id ?? computeProjectId(projectRoot);

    const rows = bingRepo.listPerformance(projectId, options.limit ?? 100);
    const totalClicks = rows.reduce((acc, r) => acc + r.clicks, 0);
    const totalImpressions = rows.reduce((acc, r) => acc + r.impressions, 0);
    const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const averagePosition = rows.length > 0 ? rows.reduce((acc, r) => acc + r.position, 0) / rows.length : 0;
    const fromCache = bingRepo.isPerformanceCached(projectId);
    const expiresAt = bingRepo.getCachedExpiresAt(projectId) ?? '';
    const siteUrl = options.siteUrl ?? rows[0]?.url ?? '';

    return {
      siteUrl,
      totalClicks,
      totalImpressions,
      averageCtr,
      averagePosition,
      rows,
      fromCache,
      expiresAt,
    };
  } finally {
    store.close();
  }
}

