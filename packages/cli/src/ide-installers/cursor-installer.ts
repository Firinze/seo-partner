import fs from 'node:fs';
import path from 'node:path';
import type { SupportedLanguage } from '@seo-partner/core';
import {
  copySkillPackToTargetDir,
  removeSkillDir,
  verifySkillDirIntegrity,
  type IdeInstallerAdapter,
} from './index.js';

export class CursorInstaller implements IdeInstallerAdapter {
  public readonly target = 'cursor' as const;
  public readonly displayName = 'Cursor';
  public readonly skillRelativeDir = '.cursor/skills/seo-partner';

  public detectInWorkspace(projectRoot: string): boolean {
    return fs.existsSync(path.join(projectRoot, '.cursor'));
  }

  public install(options: {
    projectRoot: string;
    lang: SupportedLanguage;
    dryRun: boolean;
  }): ReadonlyArray<string> {
    const created = copySkillPackToTargetDir({
      projectRoot: options.projectRoot,
      targetSkillRelDir: this.skillRelativeDir,
      lang: options.lang,
      dryRun: options.dryRun,
    });

    const ruleRelPath = '.cursor/rules/seo-partner.mdc';
    const ruleFullPath = path.join(options.projectRoot, ruleRelPath);
    created.push(ruleRelPath);

    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(ruleFullPath), { recursive: true });
      const mdcContent = [
        '---',
        'description: SEO Partner deterministic workflow and 15 Must rules',
        'globs: **/*.{ts,tsx,js,jsx,html,md,mdx}',
        '---',
        '',
        'Read `.cursor/skills/seo-partner/SKILL.md` and run `seo-partner scan --json` / `seo-partner audit --json` before making SEO recommendations.',
        '',
      ].join('\n');
      fs.writeFileSync(ruleFullPath, mdcContent, 'utf-8');
    }

    return created;
  }

  public verify(projectRoot: string) {
    return verifySkillDirIntegrity(projectRoot, this.skillRelativeDir);
  }

  public uninstall(options: { projectRoot: string; dryRun: boolean }): ReadonlyArray<string> {
    const removed = removeSkillDir(options.projectRoot, this.skillRelativeDir, options.dryRun);
    const ruleRelPath = '.cursor/rules/seo-partner.mdc';
    const ruleFullPath = path.join(options.projectRoot, ruleRelPath);
    if (fs.existsSync(ruleFullPath)) {
      if (!options.dryRun) {
        fs.rmSync(ruleFullPath, { force: true });
      }
      removed.push(ruleRelPath);
    }
    return removed;
  }
}

