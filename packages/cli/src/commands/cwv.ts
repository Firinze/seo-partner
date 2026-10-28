import path from 'node:path';
import {
  runCwvFetchCommand,
  type CwvFetchCommandResult,
} from '@seo-partner/tools';

export interface CwvCommandOptions {
  readonly projectRoot: string;
  readonly url?: string;
  readonly formFactor?: 'PHONE' | 'DESKTOP' | 'ALL';
  readonly refresh?: boolean;
  readonly offline?: boolean;
  readonly apiKey?: string;
}

export async function runCwvCommand(
  options: CwvCommandOptions,
): Promise<CwvFetchCommandResult> {
  const projectRoot = path.resolve(options.projectRoot);

  if (!options.url) {
    throw new Error('Missing --url option for cwv fetch (usage: seo-partner cwv fetch --url <url>)');
  }

  const result = await runCwvFetchCommand({
    projectRoot,
    url: options.url,
    formFactor: options.formFactor,
    refresh: options.refresh,
    offline: options.offline,
    apiKey: options.apiKey,
  });

  if (!result.success) {
    throw new Error(result.error ?? 'Core Web Vitals fetch failed');
  }

  return result;
}

