import fs from 'node:fs';
import path from 'node:path';
import {
  loadSeoConfig,
  verifyGitignoreSecurity,
} from '@seo-partner/core';
import { SeoDatabase } from '@seo-partner/store';
import { checkWatchFreshness } from '@seo-partner/tools';
import {
  EXPECTED_REFERENCE_FILES,
  IDE_INSTALLERS,
  resolveBundledSkillSourceDir,
} from '../ide-installers/index.js';

export interface DoctorCheckItem {
  readonly id: string;
  readonly status: 'ok' | 'warn' | 'error';
  readonly message: string;
}

export interface DoctorCommandResult {
  readonly healthy: boolean;
  readonly checks: ReadonlyArray<DoctorCheckItem>;
}

export function extractWatchLastVerifiedDate(markdownContent: string): string | null {
  const m =
    /(?:Last Verified|Derni[èe]re v[ée]rification)\s*:\s*(\d{4}-\d{2}-\d{2})/i.exec(
      markdownContent,
    );
  return m?.[1] ?? null;
}

export function runDoctorCommand(options: { projectRoot: string }): DoctorCommandResult {
  const projectRoot = path.resolve(options.projectRoot);
  const checks: DoctorCheckItem[] = [];

  // 1. Node.js version check (>= 22.5.0)
  const nodeVer = process.versions.node;
  const parts = nodeVer.split('.').map(Number);
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  const nodeOk = major > 22 || (major === 22 && minor >= 5);
  checks.push({
    id: 'node-version',
    status: nodeOk ? 'ok' : 'error',
    message: nodeOk
      ? `Node.js v${nodeVer} (>= 22.5.0)`
      : `Node.js v${nodeVer} is below required >= 22.5.0`,
  });

  // 2. .seo/config.json check
  let config = null;
  try {
    config = loadSeoConfig(projectRoot);
    if (config) {
      checks.push({
        id: 'seo-config',
        status: 'ok',
        message: `.seo/config.json valid (lang: ${config.lang}, targets: ${config.ideTargets.join(', ') || 'none'})`,
      });
    } else {
      checks.push({
        id: 'seo-config',
        status: 'error',
        message: 'Missing .seo/config.json (run "seo-partner init")',
      });
    }
  } catch (err) {
    checks.push({
      id: 'seo-config',
      status: 'error',
      message: err instanceof Error ? err.message : 'Invalid .seo/config.json',
    });
  }

  // 3. .gitignore security check
  const gitignoreCheck = verifyGitignoreSecurity(projectRoot);
  checks.push({
    id: 'gitignore-security',
    status: gitignoreCheck.secure ? 'ok' : 'error',
    message: gitignoreCheck.secure
      ? '.agents/ and .seo/index.db* excluded in .gitignore'
      : `Missing .gitignore exclusions: ${gitignoreCheck.missingEntries.join(', ')}`,
  });

  // 4. IDE Skill pack integrity check
  let watchFilePath: string | null = null;
  if (config && config.ideTargets.length > 0) {
    let allTargetsOk = true;
    const targetSummaries: string[] = [];
    for (const target of config.ideTargets) {
      const installer = IDE_INSTALLERS.get(target);
      if (!installer) continue;
      const v = installer.verify(projectRoot);
      if (!v.installed) allTargetsOk = false;
      if (v.watchFilePath && !watchFilePath) watchFilePath = v.watchFilePath;
      targetSummaries.push(
        `${target} (${v.referencesPresent}/${EXPECTED_REFERENCE_FILES.length} refs)`,
      );
    }
    checks.push({
      id: 'ide-skill',
      status: allTargetsOk ? 'ok' : 'error',
      message: allTargetsOk
        ? `Skill pack installed: ${targetSummaries.join(', ')}`
        : `Incomplete skill installation: ${targetSummaries.join(', ')}`,
    });
  } else {
    const bundledWatch = path.join(
      resolveBundledSkillSourceDir(config?.lang ?? 'en'),
      'references',
      'veille-mises-a-jour.md',
    );
    if (fs.existsSync(bundledWatch)) watchFilePath = bundledWatch;
    checks.push({
      id: 'ide-skill',
      status: config ? 'ok' : 'warn',
      message: config
        ? 'Terminal-only mode (no IDE skill target configured)'
        : 'IDE skill not initialized yet',
    });
  }

  // 5. Watch freshness check (<= 90 days)
  const watchCheck = checkWatchFreshness(projectRoot, 90);
  checks.push({
    id: 'watch-freshness',
    status: watchCheck.status,
    message: watchCheck.message,
  });

  // 6. SQLite WAL store check
  try {
    const store = SeoDatabase.open(projectRoot);
    const mode = store.getJournalMode();
    store.close();
    checks.push({
      id: 'sqlite-store',
      status: mode === 'wal' ? 'ok' : 'warn',
      message: `SQLite store operational (journal_mode: ${mode.toUpperCase()})`,
    });
  } catch (err) {
    checks.push({
      id: 'sqlite-store',
      status: 'error',
      message: `SQLite store error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const healthy = checks.every((c) => c.status !== 'error');
  return { healthy, checks };
}

