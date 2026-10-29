import { checkWatchFreshness, type WatchFreshnessCheckResult } from './checks/watch-freshness.js';

export interface DoctorEngineOptions {
  readonly projectRoot: string;
}

export interface DoctorEngineResult {
  readonly watchFreshness: WatchFreshnessCheckResult;
}

export function runDoctorEngine(options: DoctorEngineOptions): DoctorEngineResult {
  return {
    watchFreshness: checkWatchFreshness(options.projectRoot),
  };
}

export * from './checks/watch-freshness.js';

