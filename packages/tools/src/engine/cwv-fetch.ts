import { CruxClient, PageSpeedClient } from '@seo-partner/connectors';
import { SeoDatabase, CwvRepository, ProjectRepository } from '@seo-partner/store';
import type { CwvMetricRecord } from '@seo-partner/core';
import { runScanCommand } from './scan.js';

async function resolveProject(projectRoot: string, store: SeoDatabase) {
  let project = new ProjectRepository(store).getLatestProject();
  if (!project) {
    await runScanCommand({ projectRoot });
    project = new ProjectRepository(store).getLatestProject();
  }
  return project;
}

export interface CwvFetchCommandOptions {
  projectRoot: string;
  url: string;
  formFactor?: 'PHONE' | 'DESKTOP' | 'ALL';
  apiKey?: string;
  refresh?: boolean;
  offline?: boolean;
}

export interface CwvFetchCommandResult {
  success: boolean;
  records: ReadonlyArray<CwvMetricRecord>;
  cached: boolean;
  url: string;
  error?: string;
}

export async function runCwvFetchCommand(
  options: CwvFetchCommandOptions,
): Promise<CwvFetchCommandResult> {
  const store = SeoDatabase.open(options.projectRoot);
  try {
    const project = await resolveProject(options.projectRoot, store);
    if (!project) {
      return {
        success: false,
        records: [],
        cached: false,
        url: options.url,
        error: 'Unable to initialize project for CWV fetch.',
      };
    }

    const cwvRepo = new CwvRepository(store);
    const formFactors: Array<'PHONE' | 'DESKTOP'> =
      !options.formFactor || options.formFactor === 'ALL'
        ? ['PHONE', 'DESKTOP']
        : [options.formFactor];

    // Check cache if not forcing refresh
    if (!options.refresh) {
      const cachedRecords: CwvMetricRecord[] = [];
      let allFresh = true;

      for (const ff of formFactors) {
        const cached = cwvRepo.getMetricsForUrl(project.id, options.url, ff);
        if (cached && cwvRepo.isFresh(project.id, options.url, ff)) {
          cachedRecords.push(cached);
        } else {
          allFresh = false;
        }
      }

      if (allFresh && cachedRecords.length > 0) {
        return {
          success: true,
          records: cachedRecords,
          cached: true,
          url: options.url,
        };
      }
    }

    // If offline requested or no connectivity, check if any stale cache exists
    if (options.offline) {
      const staleRecords: CwvMetricRecord[] = [];
      for (const ff of formFactors) {
        const cached = cwvRepo.getMetricsForUrl(project.id, options.url, ff);
        if (cached) {
          staleRecords.push(cached);
        }
      }

      if (staleRecords.length > 0) {
        return {
          success: true,
          records: staleRecords,
          cached: true,
          url: options.url,
        };
      }

      return {
        success: false,
        records: [],
        cached: false,
        url: options.url,
        error: 'Offline mode enabled and no cached CWV metrics available in SQLite.',
      };
    }

    // Fetch from CrUX
    const crux = new CruxClient({ apiKey: options.apiKey });
    let fetched = await crux.fetchMetrics({
      projectId: project.id,
      url: options.url,
      formFactor: options.formFactor,
      apiKey: options.apiKey,
    });

    // If CrUX returned no metrics, try PageSpeed Insights
    if (fetched.length === 0) {
      const psi = new PageSpeedClient({ apiKey: options.apiKey });
      for (const ff of formFactors) {
        const psiRecord = await psi.fetchMetrics({
          projectId: project.id,
          url: options.url,
          strategy: ff === 'PHONE' ? 'mobile' : 'desktop',
          apiKey: options.apiKey,
        });
        if (psiRecord) {
          fetched.push(psiRecord);
        }
      }
    }

    if (fetched.length > 0) {
      cwvRepo.saveMetrics(fetched);
      return {
        success: true,
        records: fetched,
        cached: false,
        url: options.url,
      };
    }

    return {
      success: false,
      records: [],
      cached: false,
      url: options.url,
      error: `No Core Web Vitals data found for ${options.url} (insufficient field data in CrUX / PageSpeed).`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      records: [],
      cached: false,
      url: options.url,
      error: msg,
    };
  } finally {
    store.close();
  }
}

