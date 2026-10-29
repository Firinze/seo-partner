import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IdeTarget, SupportedLanguage } from '@seo-partner/core';
import { AgyInstaller } from './agy-installer.js';
import { ClaudeInstaller } from './claude-installer.js';
import { CursorInstaller } from './cursor-installer.js';
import { GeminiInstaller } from './gemini-installer.js';
import { CodexInstaller } from './codex-installer.js';

export const EXPECTED_REFERENCE_FILES: ReadonlyArray<string> = [
  'veille-mises-a-jour.md',
  'audit-technique.md',
  'implementation-nextjs.md',
  'strategie-mots-cles.md',
  'on-page-et-contenu.md',
  'schema-donnees-structurees.md',
  'seo-local.md',
  'geo-geographique-et-generatif.md',
  'netlinking-autorite.md',
  'mesure-dashboard-roi.md',
  'roadmap-12-mois.md',
];

export interface IdeInstallerAdapter {
  readonly target: IdeTarget;
  readonly displayName: string;
  readonly skillRelativeDir: string;

  detectInWorkspace(projectRoot: string): boolean;
  install(options: {
    projectRoot: string;
    lang: SupportedLanguage;
    dryRun: boolean;
  }): ReadonlyArray<string>;
  verify(projectRoot: string): {
    installed: boolean;
    referencesPresent: number;
    watchFilePath: string | null;
  };
  uninstall(options: { projectRoot: string; dryRun: boolean }): ReadonlyArray<string>;
}

export function resolveBundledSkillSourceDir(lang: SupportedLanguage): string {
  const currentFile =
    typeof __filename !== 'undefined'
      ? __filename
      : (typeof import.meta !== 'undefined' && import.meta.url
          ? fileURLToPath(import.meta.url)
          : process.cwd());
  const currentDir = path.dirname(currentFile);

  // 1. Packaged location inside @seo-partner/cli (e.g. node_modules/seo-partner/skills/seo-partner/<lang>)
  // When executing from dist/ide-installers/, ../../skills reaches the package root skills directory
  const candidatePkgSkills = path.resolve(currentDir, '..', '..', 'skills', 'seo-partner', lang);
  if (fs.existsSync(candidatePkgSkills)) {
    return candidatePkgSkills;
  }

  // 2. Monorepo root location during local development (packages/cli/dist/ide-installers/../../../../skills)
  const candidateRepoSkills = path.resolve(currentDir, '..', '..', '..', '..', 'skills', 'seo-partner', lang);
  if (fs.existsSync(candidateRepoSkills)) {
    return candidateRepoSkills;
  }

  return candidatePkgSkills;
}

export function copySkillPackToTargetDir(options: {
  projectRoot: string;
  targetSkillRelDir: string;
  lang: SupportedLanguage;
  dryRun: boolean;
}): string[] {
  const sourceDir = resolveBundledSkillSourceDir(options.lang);
  const destDir = path.join(options.projectRoot, options.targetSkillRelDir);
  const createdFiles: string[] = [];

  const srcSkillMd = path.join(sourceDir, 'SKILL.md');
  if (!fs.existsSync(srcSkillMd)) {
    // If bundled skill source is missing, skip copying gracefully without crashing
    return createdFiles;
  }

  const skillFileRel = path.posix.join(
    options.targetSkillRelDir.split(path.sep).join('/'),
    'SKILL.md',
  );
  createdFiles.push(skillFileRel);

  for (const refName of EXPECTED_REFERENCE_FILES) {
    createdFiles.push(
      path.posix.join(
        options.targetSkillRelDir.split(path.sep).join('/'),
        'references',
        refName,
      ),
    );
  }

  if (!options.dryRun) {
    fs.mkdirSync(path.join(destDir, 'references'), { recursive: true });
    try {
      fs.copyFileSync(srcSkillMd, path.join(destDir, 'SKILL.md'));
    } catch {
      // Non-fatal safety guard
    }
    for (const refName of EXPECTED_REFERENCE_FILES) {
      const srcRef = path.join(sourceDir, 'references', refName);
      if (fs.existsSync(srcRef)) {
        try {
          fs.copyFileSync(srcRef, path.join(destDir, 'references', refName));
        } catch {
          // Non-fatal safety guard
        }
      }
    }
  }

  return createdFiles;
}

export function verifySkillDirIntegrity(
  projectRoot: string,
  targetSkillRelDir: string,
): {
  installed: boolean;
  referencesPresent: number;
  watchFilePath: string | null;
} {
  const destDir = path.join(projectRoot, targetSkillRelDir);
  const skillMdPath = path.join(destDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    return { installed: false, referencesPresent: 0, watchFilePath: null };
  }

  let referencesPresent = 0;
  for (const refName of EXPECTED_REFERENCE_FILES) {
    if (fs.existsSync(path.join(destDir, 'references', refName))) {
      referencesPresent += 1;
    }
  }

  const watchPath = path.join(destDir, 'references', 'veille-mises-a-jour.md');
  return {
    installed: referencesPresent === EXPECTED_REFERENCE_FILES.length,
    referencesPresent,
    watchFilePath: fs.existsSync(watchPath) ? watchPath : null,
  };
}

export function removeSkillDir(
  projectRoot: string,
  targetSkillRelDir: string,
  dryRun: boolean,
): string[] {
  const fullPath = path.join(projectRoot, targetSkillRelDir);
  if (!fs.existsSync(fullPath)) return [];
  const relPosix = targetSkillRelDir.split(path.sep).join('/');
  if (!dryRun) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
  return [relPosix];
}

export const IDE_INSTALLERS: ReadonlyMap<IdeTarget, IdeInstallerAdapter> = new Map<
  IdeTarget,
  IdeInstallerAdapter
>([
  ['agy', new AgyInstaller()],
  ['claude', new ClaudeInstaller()],
  ['cursor', new CursorInstaller()],
  ['gemini', new GeminiInstaller()],
  ['codex', new CodexInstaller()],
]);

export function detectActiveIdeFromEnv(): IdeTarget | null {
  const envKeys = Object.keys(process.env);

  // 1. Google Antigravity (must check before generic VS Code since it uses a VS Code host)
  if (
    process.env.ANTIGRAVITY_AGENT === '1' ||
    Boolean(process.env.ANTIGRAVITY_APP_DATA_DIR) ||
    Boolean(process.env.ANTIGRAVITY_PROJECT_ID) ||
    process.env.ANTIGRAVITY_VSCODE_HOST === '1' ||
    Boolean(process.env.AGY_LLM_GATEWAY_URL) ||
    envKeys.some((k) => k.toLowerCase().startsWith('antigravity_') || k.toLowerCase().startsWith('agy_'))
  ) {
    return 'agy';
  }

  // 2. Cursor (must check before generic VS Code since it is a VS Code fork)
  if (
    Boolean(process.env.CURSOR_CLI) ||
    Boolean(process.env.CURSOR_AGENT) ||
    Boolean(process.env.CURSOR_TRACE_ID) ||
    Boolean(process.env.CURSOR_CONFIG_DIR) ||
    envKeys.some((k) => k.toLowerCase().includes('cursor'))
  ) {
    return 'cursor';
  }

  // 3. Claude Code CLI / hooks
  if (
    process.env.CLAUDECODE === '1' ||
    process.env.CLAUDE_CODE_CHILD_SESSION === '1' ||
    Boolean(process.env.CLAUDE_CODE) ||
    Boolean(process.env.CLAUDE_PROJECT_DIR) ||
    envKeys.some((k) => k.toLowerCase().includes('claudecode'))
  ) {
    return 'claude';
  }

  // 4. Gemini CLI
  if (Boolean(process.env.GEMINI_CLI) || Boolean(process.env.GEMINI_CLI_HOME)) {
    return 'gemini';
  }

  // 5. OpenAI Codex
  if (Boolean(process.env.CODEX_CLI) || Boolean(process.env.OPENAI_CODEX)) {
    return 'codex';
  }

  return null;
}

export function detectWorkspaceIdeTargets(projectRoot: string): ReadonlyArray<IdeTarget> {
  // 1. Environment-first detection: if running inside a specific IDE terminal, configure THAT active IDE exclusively
  const activeFromEnv = detectActiveIdeFromEnv();
  if (activeFromEnv) {
    return [activeFromEnv];
  }

  // 2. Workspace directory markers explicitly present in the repository (fallback when running outside an IDE)
  const detected: IdeTarget[] = [];
  for (const [target, installer] of IDE_INSTALLERS.entries()) {
    if (installer.detectInWorkspace(projectRoot)) {
      detected.push(target);
    }
  }

  if (detected.length > 0) {
    return detected;
  }

  // 3. Document fallback markers (only if no dedicated IDE directory or active terminal was detected)
  if (fs.existsSync(path.join(projectRoot, 'CLAUDE.md'))) {
    return ['claude'];
  }
  if (fs.existsSync(path.join(projectRoot, 'AGENTS.md'))) {
    return ['codex'];
  }

  // 4. Default fallback
  return ['agy'];
}

