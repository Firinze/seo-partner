import fs from 'node:fs';
import path from 'node:path';
import type { SupportedLanguage } from '@seo-partner/core';
import {
  copySkillPackToTargetDir,
  removeSkillDir,
  verifySkillDirIntegrity,
  type IdeInstallerAdapter,
} from './index.js';

export class GeminiInstaller implements IdeInstallerAdapter {
  public readonly target = 'gemini' as const;
  public readonly displayName = 'Gemini CLI';
  public readonly skillRelativeDir = '.gemini/skills/seo-partner';

  public detectInWorkspace(projectRoot: string): boolean {
    return fs.existsSync(path.join(projectRoot, '.gemini'));
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

