import path from 'node:path';
import {
  createDefaultConfig,
  ensureGitignoreSecurity,
  initDecisionsFile,
  saveSeoConfig,
  VALID_IDE_TARGETS,
  VALID_LANGUAGES,
  type IdeTarget,
  type SupportedLanguage,
} from '@seo-partner/core';
import {
  detectWorkspaceIdeTargets,
  IDE_INSTALLERS,
} from '../ide-installers/index.js';

export interface InitCommandOptions {
  readonly projectRoot: string;
  readonly ide?: string;
  readonly lang?: string;
  readonly terminalOnly?: boolean;
  readonly dryRun?: boolean;
  readonly ignoreAgentTools?: boolean;
}

export interface InitCommandResult {
  readonly projectRoot: string;
  readonly ideTargets: ReadonlyArray<IdeTarget>;
  readonly lang: SupportedLanguage;
  readonly createdFiles: ReadonlyArray<string>;
  readonly gitignoreUpdated: boolean;
  readonly gitignoreAddedEntries: ReadonlyArray<string>;
  readonly dryRun: boolean;
}

export function runInitCommand(options: InitCommandOptions): InitCommandResult {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = Boolean(options.dryRun);
  const lang: SupportedLanguage =
    options.lang && (VALID_LANGUAGES as ReadonlyArray<string>).includes(options.lang)
      ? (options.lang as SupportedLanguage)
      : 'en';

  let ideTargets: ReadonlyArray<IdeTarget> = [];
  if (!options.terminalOnly) {
    if (options.ide) {
      const requested = options.ide
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is IdeTarget =>
          (VALID_IDE_TARGETS as ReadonlyArray<string>).includes(s),
        );
      if (requested.length === 0) {
        throw new Error(
          `Unsupported IDE target "${options.ide}". Valid targets: ${VALID_IDE_TARGETS.join(', ')}`,
        );
      }
      ideTargets = requested;
    } else {
      ideTargets = detectWorkspaceIdeTargets(projectRoot);
    }
  }

  const createdFiles: string[] = [];

  const config = createDefaultConfig({
    projectRoot,
    lang,
    ideTargets,
  });
  saveSeoConfig(projectRoot, config, dryRun);
  createdFiles.push('.seo/config.json');

  initDecisionsFile(projectRoot, dryRun);
  createdFiles.push('.seo/decisions.md');

  for (const target of ideTargets) {
    const installer = IDE_INSTALLERS.get(target);
    if (installer) {
      const installedFiles = installer.install({
        projectRoot,
        lang,
        dryRun,
      });
      createdFiles.push(...installedFiles);
    }
  }

  const gitignoreRes = ensureGitignoreSecurity(projectRoot, dryRun);
  if (gitignoreRes.updated) {
    createdFiles.push('.gitignore');
  }

  return {
    projectRoot,
    ideTargets,
    lang,
    createdFiles,
    gitignoreUpdated: gitignoreRes.updated,
    gitignoreAddedEntries: gitignoreRes.addedEntries,
    dryRun,
  };
}

