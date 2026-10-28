import fs from 'node:fs';
import path from 'node:path';
import type { SupportedLanguage } from '@seo-partner/core';
import {
  copySkillPackToTargetDir,
  removeSkillDir,
  verifySkillDirIntegrity,
  type IdeInstallerAdapter,
} from './index.js';

export class ClaudeInstaller implements IdeInstallerAdapter {
  public readonly target = 'claude' as const;
  public readonly displayName = 'Claude Code';
  public readonly skillRelativeDir = '.claude/skills/seo-partner';

  public detectInWorkspace(projectRoot: string): boolean {
    return (
      fs.existsSync(path.join(projectRoot, '.claude')) ||
      fs.existsSync(path.join(projectRoot, 'CLAUDE.md'))
    );
  }

  public install(options: {
    projectRoot: string;
    lang: SupportedLanguage;
    dryRun: boolean;
  }): ReadonlyArray<string> {
    return copySkillPackToTargetDir({
      projectRoot: options.projectRoot,
      targetSkillRelDir: this.skillRelativeDir,
      lang: options.lang,
      dryRun: options.dryRun,
    });
  }

  public verify(projectRoot: string) {
    return verifySkillDirIntegrity(projectRoot, this.skillRelativeDir);
  }

  public uninstall(options: { projectRoot: string; dryRun: boolean }): ReadonlyArray<string> {
    return removeSkillDir(options.projectRoot, this.skillRelativeDir, options.dryRun);
  }
}

