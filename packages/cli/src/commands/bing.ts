import path from 'node:path';
import {
  runBingSyncCommand,
  runBingInspectCommand,
} from '@seo-partner/tools';
import type {
  BingSyncResult,
  BingInspectionRecord,
} from '@seo-partner/core';

export interface BingCliCommandOptions {
  readonly projectRoot: string;
  readonly subcommand: 'sync' | 'inspect';
  readonly siteUrl?: string;
  readonly url?: string;
  readonly apiKey?: string;
  readonly force?: boolean;
}

export type BingCliCommandResult =
  | { readonly kind: 'sync'; readonly result: BingSyncResult }
  | { readonly kind: 'inspect'; readonly result: BingInspectionRecord };

export async function runBingCliCommand(
  options: BingCliCommandOptions,
): Promise<BingCliCommandResult> {
  const projectRoot = path.resolve(options.projectRoot);

  if (options.subcommand === 'sync') {
    if (!options.siteUrl) {
      throw new Error("Missing --site option for bing sync (e.g. --site https://example.com)");
    }

    const result = await runBingSyncCommand({
      projectRoot,
      siteUrl: options.siteUrl,
      apiKey: options.apiKey,
      force: options.force,
    });

    return { kind: 'sync', result };
  }

  if (options.subcommand === 'inspect') {
    if (!options.url) {
      throw new Error("Missing --url option for bing inspect (e.g. --url https://example.com/page)");
    }

    const result = await runBingInspectCommand({
      projectRoot,
      url: options.url,
      siteUrl: options.siteUrl,
      apiKey: options.apiKey,
      force: options.force,
    });

    return { kind: 'inspect', result };
  }

  throw new Error(`Unknown bing subcommand: '${options.subcommand}'. Expected 'sync' or 'inspect'.`);
}

