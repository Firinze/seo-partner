import fs from 'node:fs';
import path from 'node:path';
import { getSeoDirPath, loadSeoConfig, VALID_IDE_TARGETS } from '@seo-partner/core';
import { IDE_INSTALLERS } from '../ide-installers/index.js';

export interface UninstallCommandOptions {
  readonly projectRoot: string;
  readonly purgeData?: boolean;
  readonly dryRun?: boolean;
}

export interface UninstallCommandResult {
  readonly projectRoot: string;
  readonly removedPaths: ReadonlyArray<string>;
  readonly dryRun: boolean;
}

export function runUninstallCommand(
  options: UninstallCommandOptions,
): UninstallCommandResult {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = Boolean(options.dryRun);
  const removedPaths: string[] = [];

  const config = loadSeoConfig(projectRoot);
  const targetsToClean = config?.ideTargets ?? VALID_IDE_TARGETS;

  for (const target of targetsToClean) {
    const installer = IDE_INSTALLERS.get(target);
    if (installer) {
      const removed = installer.uninstall({ projectRoot, dryRun });
      removedPaths.push(...removed);
    }
  }

  if (options.purgeData) {
    const seoDir = getSeoDirPath(projectRoot);
    if (fs.existsSync(seoDir)) {
      if (!dryRun) {
        fs.rmSync(seoDir, { recursive: true, force: true });
      }
      removedPaths.push('.seo');
    }
  }

  return {
    projectRoot,
    removedPaths,
    dryRun,
  };
}

