import path from 'node:path';
import {
  runGscSyncCommand,
  runGscInspectCommand,
  type GscSyncCommandResult,
  type GscInspectCommandResult,
} from '@seo-partner/tools';

export interface GscCommandOptions {
  readonly projectRoot: string;
  readonly subcommand: 'sync' | 'inspect';
  readonly siteUrl?: string;
  readonly url?: string;
  readonly days?: number;
  readonly credentialsPath?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

export type GscCommandResult =
  | { readonly kind: 'sync'; readonly result: GscSyncCommandResult }
  | { readonly kind: 'inspect'; readonly result: GscInspectCommandResult };

export async function runGscCommand(
  options: GscCommandOptions,
): Promise<GscCommandResult> {
  const projectRoot = path.resolve(options.projectRoot);

  if (options.subcommand === 'sync') {
    if (!options.siteUrl) {
      throw new Error('Missing --site option for gsc sync (e.g. --site https://example.com/)');
    }

    const result = await runGscSyncCommand({
      projectRoot,
      siteUrl: options.siteUrl,
      days: options.days,
      credentialsPath: options.credentialsPath,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    if (!result.success) {
      throw new Error(result.error ?? 'GSC sync failed');
    }

    return { kind: 'sync', result };
  }

  if (options.subcommand === 'inspect') {
    if (!options.url) {
      throw new Error('Missing --url option for gsc inspect (e.g. --url https://example.com/page)');
    }
    const siteUrl = options.siteUrl ?? options.url;

    const result = await runGscInspectCommand({
      projectRoot,
      siteUrl,
      url: options.url,
      credentialsPath: options.credentialsPath,
    });

    if (!result.success || !result.record) {
      throw new Error(result.error ?? 'GSC inspection failed');
    }

    return { kind: 'inspect', result };
  }

  throw new Error(`Unknown gsc subcommand: ${options.subcommand}. Expected 'sync' or 'inspect'.`);
}

