import path from 'node:path';
import type { PrProposal } from '@seo-partner/core';
import { runPrProposalEngine } from '@seo-partner/tools';

export interface PrCommandCliOptions {
  projectRoot: string;
  branch?: string;
  base?: string;
  title?: string;
  publish?: boolean;
  force?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

export async function runPrCommand(options: PrCommandCliOptions): Promise<PrProposal> {
  const projectRoot = path.resolve(options.projectRoot);

  return runPrProposalEngine({
    projectRoot,
    branch: options.branch,
    base: options.base,
    title: options.title,
    publish: options.publish,
    force: options.force,
    dryRun: options.dryRun,
  });
}

