import { GscAuthenticator, GscClient, GscInspector } from '@seo-partner/connectors';
import { SeoDatabase, GscRepository, ProjectRepository } from '@seo-partner/store';
import type { GscPerformanceRecord, GscInspectionRecord } from '@seo-partner/core';
import { runScanCommand } from './scan.js';

async function resolveProject(projectRoot: string, store: SeoDatabase) {
  let project = new ProjectRepository(store).getLatestProject();
  if (!project) {
    await runScanCommand({ projectRoot });
    project = new ProjectRepository(store).getLatestProject();
  }
  return project;
}

export interface GscSyncCommandOptions {
  projectRoot: string;
  siteUrl: string;
  days?: number;
  credentialsPath?: string;
  startDate?: string;
  endDate?: string;
}

export interface GscSyncCommandResult {
  success: boolean;
  recordsCount: number;
  siteUrl: string;
  syncedAt: string;
  error?: string;
}

export async function runGscSyncCommand(
  options: GscSyncCommandOptions,
): Promise<GscSyncCommandResult> {
  let store = SeoDatabase.open(options.projectRoot);
  try {
    const project = await resolveProject(options.projectRoot, store);
    if (!project) {
      return {
        success: false,
        recordsCount: 0,
        siteUrl: options.siteUrl,
        syncedAt: new Date().toISOString(),
        error: 'Unable to initialize project for GSC sync.',
      };
    }

    const auth = options.credentialsPath
      ? GscAuthenticator.fromFile(options.credentialsPath)
      : GscAuthenticator.resolveFromProject(options.projectRoot);

    if (!auth) {
      return {
        success: false,
        recordsCount: 0,
        siteUrl: options.siteUrl,
        syncedAt: new Date().toISOString(),
        error:
          'No GSC credentials found. Provide service account JSON in .seo/credentials.json or set GOOGLE_APPLICATION_CREDENTIALS.',
      };
    }

    const client = new GscClient(auth);
    const records = await client.fetchPerformance({
      projectId: project.id,
      siteUrl: options.siteUrl,
      days: options.days ?? 28,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    const gscRepo = new GscRepository(store);
    gscRepo.savePerformanceRows(records);

    return {
      success: true,
      recordsCount: records.length,
      siteUrl: options.siteUrl,
      syncedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      recordsCount: 0,
      siteUrl: options.siteUrl,
      syncedAt: new Date().toISOString(),
      error: msg,
    };
  } finally {
    store.close();
  }
}

export interface GscInspectCommandOptions {
  projectRoot: string;
  siteUrl: string;
  url: string;
  credentialsPath?: string;
}

export interface GscInspectCommandResult {
  success: boolean;
  record: GscInspectionRecord | null;
  error?: string;
}

export async function runGscInspectCommand(
  options: GscInspectCommandOptions,
): Promise<GscInspectCommandResult> {
  const store = SeoDatabase.open(options.projectRoot);
  try {
    const project = await resolveProject(options.projectRoot, store);
    if (!project) {
      return {
        success: false,
        record: null,
        error: 'Unable to initialize project for GSC inspection.',
      };
    }

    const auth = options.credentialsPath
      ? GscAuthenticator.fromFile(options.credentialsPath)
      : GscAuthenticator.resolveFromProject(options.projectRoot);

    if (!auth) {
      return {
        success: false,
        record: null,
        error:
          'No GSC credentials found. Provide service account JSON in .seo/credentials.json or set GOOGLE_APPLICATION_CREDENTIALS.',
      };
    }

    const inspector = new GscInspector(auth);
    const record = await inspector.inspectUrl({
      projectId: project.id,
      siteUrl: options.siteUrl,
      inspectionUrl: options.url,
    });

    const gscRepo = new GscRepository(store);
    gscRepo.saveInspectionRecord(record);

    return {
      success: true,
      record,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      record: null,
      error: msg,
    };
  } finally {
    store.close();
  }
}
