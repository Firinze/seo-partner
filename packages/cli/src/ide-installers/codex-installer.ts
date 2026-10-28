import fs from 'node:fs';
import path from 'node:path';
import type { SupportedLanguage } from '@seo-partner/core';
import {
  copySkillPackToTargetDir,
  removeSkillDir,
  verifySkillDirIntegrity,
  type IdeInstallerAdapter,
} from './index.js';

const AGENTS_SECTION_START = '<!-- seo-partner:start -->';
const AGENTS_SECTION_END = '<!-- seo-partner:end -->';

export class CodexInstaller implements IdeInstallerAdapter {
  public readonly target = 'codex' as const;
  public readonly displayName = 'OpenAI Codex / AGENTS.md';
  public readonly skillRelativeDir = '.codex/skills/seo-partner';

  public detectInWorkspace(projectRoot: string): boolean {
    return (
      fs.existsSync(path.join(projectRoot, '.codex')) ||
      fs.existsSync(path.join(projectRoot, 'AGENTS.md'))
    );
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

    const agentsMdPath = path.join(options.projectRoot, 'AGENTS.md');
    const existing = fs.existsSync(agentsMdPath)
      ? fs.readFileSync(agentsMdPath, 'utf-8')
      : '';

    if (!existing.includes(AGENTS_SECTION_START)) {
      created.push('AGENTS.md');
      if (!options.dryRun) {
        const block = [
          '',
          AGENTS_SECTION_START,
          '## SEO Partner Integration',
          'For any SEO audit, metadata optimization, structured data, or keyword strategy task, read `.codex/skills/seo-partner/SKILL.md` and run `seo-partner scan --json` and `seo-partner audit --json`.',
          AGENTS_SECTION_END,
          '',
        ].join('\n');
        fs.writeFileSync(agentsMdPath, existing + block, 'utf-8');
      }
    }

    return created;
  }

  public verify(projectRoot: string) {
    return verifySkillDirIntegrity(projectRoot, this.skillRelativeDir);
  }

  public uninstall(options: { projectRoot: string; dryRun: boolean }): ReadonlyArray<string> {
    const removed = removeSkillDir(options.projectRoot, this.skillRelativeDir, options.dryRun);
    const agentsMdPath = path.join(options.projectRoot, 'AGENTS.md');
    if (fs.existsSync(agentsMdPath)) {
      const content = fs.readFileSync(agentsMdPath, 'utf-8');
      if (content.includes(AGENTS_SECTION_START)) {
        const cleaned = content.replace(
          new RegExp(`${AGENTS_SECTION_START}[\\s\\S]*?${AGENTS_SECTION_END}\\n?`, 'g'),
          '',
        );
        if (!options.dryRun) {
          if (cleaned.trim().length === 0) {
            fs.rmSync(agentsMdPath, { force: true });
          } else {
            fs.writeFileSync(agentsMdPath, cleaned, 'utf-8');
          }
        }
        removed.push('AGENTS.md#seo-partner');
      }
    }
    return removed;
  }
}

