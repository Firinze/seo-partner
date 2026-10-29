import fs from 'node:fs';
import path from 'node:path';
import type { IdeTarget, SeoConfig, SupportedLanguage } from './types.js';

export const VALID_LANGUAGES: ReadonlyArray<SupportedLanguage> = ['en', 'fr'];
export const VALID_IDE_TARGETS: ReadonlyArray<IdeTarget> = [
  'agy',
  'claude',
  'cursor',
  'gemini',
  'codex',
];

export const DEFAULT_EXCLUDE_PATTERNS: ReadonlyArray<string> = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '.seo',
  '.agents',
  '.claude',
  '.cursor',
  '.gemini',
  '.specify',
  '.qodo',
];

export function getSeoDirPath(projectRoot: string): string {
  return path.join(projectRoot, '.seo');
}

export function getSeoConfigPath(projectRoot: string): string {
  return path.join(getSeoDirPath(projectRoot), 'config.json');
}

export function getSeoDbPath(projectRoot: string): string {
  return path.join(getSeoDirPath(projectRoot), 'index.db');
}

export function detectDefaultLanguage(): SupportedLanguage {
  const envLang = (
    process.env.LC_ALL ||
    process.env.LANG ||
    process.env.LANGUAGE ||
    ''
  ).toLowerCase();
  if (envLang.startsWith('en')) return 'en';
  if (envLang.startsWith('fr')) return 'fr';

  if (process.env.VSCODE_NLS_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.VSCODE_NLS_CONFIG);
      const locale = (parsed.osLocale || parsed.userLocale || '').toLowerCase();
      if (locale.startsWith('en')) return 'en';
      if (locale.startsWith('fr')) return 'fr';
    } catch {
      // ignore
    }
  }

  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (intlLocale.startsWith('en')) return 'en';
    if (intlLocale.startsWith('fr')) return 'fr';
  } catch {
    // ignore
  }

  // Default to French as primary language
  return 'fr';
}

export function createDefaultConfig(options: {
  projectRoot: string;
  lang?: SupportedLanguage;
  ideTargets?: ReadonlyArray<IdeTarget>;
  maxFileSizeKb?: number;
}): SeoConfig {
  const now = new Date().toISOString();
  const projectName = path.basename(path.resolve(options.projectRoot)) || 'seo-project';
  return {
    version: '1.0',
    projectName,
    lang: options.lang ?? detectDefaultLanguage(),
    ideTargets: options.ideTargets ?? ['agy'],
    maxFileSizeKb: options.maxFileSizeKb ?? 1024,
    excludePatterns: DEFAULT_EXCLUDE_PATTERNS,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateSeoConfig(raw: unknown): SeoConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid .seo/config.json: expected an object');
  }
  const obj = raw as Record<string, unknown>;
  if (obj['version'] !== '1.0') {
    throw new Error(`Unsupported .seo/config.json version: ${String(obj['version'])}`);
  }
  const lang = obj['lang'];
  if (lang !== 'en' && lang !== 'fr') {
    throw new Error(`Invalid language in .seo/config.json: ${String(lang)} (expected "en" or "fr")`);
  }
  const projectName = typeof obj['projectName'] === 'string' && obj['projectName'].trim().length > 0
    ? obj['projectName']
    : 'seo-project';

  const rawTargets = Array.isArray(obj['ideTargets']) ? obj['ideTargets'] : ['agy'];
  const ideTargets: IdeTarget[] = [];
  for (const t of rawTargets) {
    if (typeof t === 'string' && (VALID_IDE_TARGETS as ReadonlyArray<string>).includes(t)) {
      ideTargets.push(t as IdeTarget);
    }
  }

  const maxFileSizeKb = typeof obj['maxFileSizeKb'] === 'number' && obj['maxFileSizeKb'] > 0
    ? obj['maxFileSizeKb']
    : 1024;

  const excludePatterns = Array.isArray(obj['excludePatterns'])
    ? obj['excludePatterns'].filter((x): x is string => typeof x === 'string')
    : [...DEFAULT_EXCLUDE_PATTERNS];

  const now = new Date().toISOString();
  return {
    version: '1.0',
    projectName,
    lang,
    ideTargets,
    maxFileSizeKb,
    excludePatterns,
    createdAt: typeof obj['createdAt'] === 'string' ? obj['createdAt'] : now,
    updatedAt: typeof obj['updatedAt'] === 'string' ? obj['updatedAt'] : now,
  };
}

export function loadSeoConfig(projectRoot: string): SeoConfig | null {
  const configPath = getSeoConfigPath(projectRoot);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  const rawContent = fs.readFileSync(configPath, 'utf-8');
  const parsed: unknown = JSON.parse(rawContent);
  return validateSeoConfig(parsed);
}

export function saveSeoConfig(projectRoot: string, config: SeoConfig, dryRun = false): string {
  const seoDir = getSeoDirPath(projectRoot);
  const configPath = getSeoConfigPath(projectRoot);
  if (!dryRun) {
    fs.mkdirSync(seoDir, { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
  }
  return configPath;
}

