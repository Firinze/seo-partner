import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_EXCLUDE_PATTERNS } from './config.js';

export const REQUIRED_GITIGNORE_ENTRIES: ReadonlyArray<string> = [
  '.seo/',
  '.seo-partner/',
  '.mcp.json',
  'seo-report.md',
  '*-audit-*.md',
  '.agents/',
  '.claude/',
  '.cursor/',
  '.gemini/',
  '.codex/',
  '.windsurf/',
  'specs/',
];

const SECRET_FILE_PATTERNS: ReadonlyArray<RegExp> = [
  /^\.env(\..+)?$/i,
  /^.*\.(pem|key|p12|pfx|keystore|jks)$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /^\.npmrc$/i,
  /^\.pypirc$/i,
  /^credentials\.json$/i,
  /^client_secret.*\.json$/i,
];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.tiff',
  '.mp4', '.webm', '.mov', '.avi', '.mp3', '.wav', '.ogg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.wasm', '.db', '.sqlite', '.sqlite3',
  '.pyc', '.class', '.o', '.obj', '.lockb',
]);

export function isSecretFile(relativePathPosix: string): boolean {
  const base = path.posix.basename(relativePathPosix);
  if (base.toLowerCase() === '.env.example' || base.toLowerCase() === '.env.template') {
    return false;
  }
  return SECRET_FILE_PATTERNS.some((re) => re.test(base));
}

export function isBinaryFile(relativePathPosix: string): boolean {
  const ext = path.posix.extname(relativePathPosix).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export function loadGitignorePatterns(projectRoot: string): ReadonlyArray<string> {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }
  const content = fs.readFileSync(gitignorePath, 'utf-8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('!'));
}

export function shouldExcludePath(
  relativePathPosix: string,
  extraIgnorePatterns: ReadonlyArray<string> = [],
): { excluded: boolean; reason: 'secret' | 'binary' | 'ignored' | null } {
  if (isSecretFile(relativePathPosix)) {
    return { excluded: true, reason: 'secret' };
  }
  if (isBinaryFile(relativePathPosix)) {
    return { excluded: true, reason: 'binary' };
  }

  const segments = relativePathPosix.split('/');
  for (const segment of segments) {
    if ((DEFAULT_EXCLUDE_PATTERNS as ReadonlyArray<string>).includes(segment)) {
      return { excluded: true, reason: 'ignored' };
    }
  }

  for (const rawPattern of extraIgnorePatterns) {
    const clean = rawPattern.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!clean) continue;
    if (
      relativePathPosix === clean ||
      relativePathPosix.startsWith(`${clean}/`) ||
      segments.includes(clean)
    ) {
      return { excluded: true, reason: 'ignored' };
    }
  }

  return { excluded: false, reason: null };
}

export function ensureGitignoreSecurity(
  projectRoot: string,
  dryRun = false,
): { updated: boolean; addedEntries: string[]; gitignorePath: string } {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const existingContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';
  const existingLines = new Set(
    existingContent
      .split(/\r?\n/)
      .map((l) => l.trim()),
  );

  const addedEntries: string[] = [];
  for (const entry of REQUIRED_GITIGNORE_ENTRIES) {
    const bare = entry.replace(/\/$/, '');
    if (!existingLines.has(entry) && !existingLines.has(bare) && !existingLines.has(`${bare}/*`)) {
      addedEntries.push(entry);
    }
  }

  if (addedEntries.length === 0) {
    return { updated: false, addedEntries: [], gitignorePath };
  }

  if (!dryRun) {
    const prefix = existingContent.length > 0 && !existingContent.endsWith('\n') ? '\n' : '';
    const block = `${prefix}\n# seo-partner security & reconstructible local state\n${addedEntries.join('\n')}\n`;
    fs.writeFileSync(gitignorePath, existingContent + block, 'utf-8');
  }

  return { updated: true, addedEntries, gitignorePath };
}

export function verifyGitignoreSecurity(projectRoot: string): {
  secure: boolean;
  missingEntries: string[];
} {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return { secure: false, missingEntries: [...REQUIRED_GITIGNORE_ENTRIES] };
  }
  const existingContent = fs.readFileSync(gitignorePath, 'utf-8');
  const existingLines = new Set(existingContent.split(/\r?\n/).map((l) => l.trim()));
  const missingEntries: string[] = [];
  for (const required of ['.agents/', '.seo/index.db']) {
    const bare = required.replace(/\/$/, '');
    if (
      !existingLines.has(required) &&
      !existingLines.has(bare) &&
      !existingLines.has('.seo/') &&
      !existingLines.has('.seo/*')
    ) {
      missingEntries.push(required);
    }
  }
  return { secure: missingEntries.length === 0, missingEntries };
}

