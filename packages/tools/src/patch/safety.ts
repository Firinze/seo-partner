import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isSecretFile } from '@seo-partner/core';

export interface SafePathResult {
  readonly ok: boolean;
  readonly absolutePath?: string;
  readonly relativePath?: string;
  readonly error?: string;
}

/**
 * Validates that a relative target path resolves strictly within the project root
 * and does not point to secret or sensitive files (.env*, .git/, private keys).
 */
export function resolveSafePath(projectRoot: string, targetPath: string): SafePathResult {
  const resolvedRoot = path.resolve(projectRoot);
  const normalizedTarget = targetPath.replace(/\\/g, '/').replace(/^\/+/, '');

  // Prevent path traversal
  const absolutePath = path.resolve(resolvedRoot, normalizedTarget);
  const relativeFromRoot = path.relative(resolvedRoot, absolutePath).replace(/\\/g, '/');

  if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    return {
      ok: false,
      error: `Path traversal detected: "${targetPath}" attempts to access outside project root.`,
    };
  }

  // Prevent access to .git or sensitive directories
  const segments = relativeFromRoot.split('/');
  if (segments.includes('.git') || segments.includes('node_modules')) {
    return {
      ok: false,
      error: `Access to restricted directory in "${targetPath}" is prohibited.`,
    };
  }

  // Prevent modifying secret files (.env*, private keys)
  if (isSecretFile(relativeFromRoot)) {
    return {
      ok: false,
      error: `Modification of sensitive/secret file "${targetPath}" is blocked.`,
    };
  }

  return {
    ok: true,
    absolutePath,
    relativePath: relativeFromRoot,
  };
}

/**
 * Detects whether any target files have uncommitted Git changes.
 * Returns empty array if git is not installed or project is not a git repo.
 */
export function getGitDirtyFiles(
  projectRoot: string,
  relativeFilePaths: ReadonlyArray<string>,
): ReadonlyArray<string> {
  if (relativeFilePaths.length === 0) return [];

  try {
    // Check if inside a git repository
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: projectRoot,
      stdio: 'pipe',
    });
  } catch {
    // Not a git repository, skip check
    return [];
  }

  try {
    const output = execFileSync(
      'git',
      ['status', '--porcelain', '--', ...relativeFilePaths],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      },
    );

    const dirtyLines = output.split('\n').filter((l) => l.trim().length > 0);
    const dirtyFiles: string[] = [];

    for (const line of dirtyLines) {
      // Line format: " M path/to/file" or "?? path/to/file"
      const filePath = line.slice(3).trim();
      const normalized = filePath.replace(/\\/g, '/');
      if (!dirtyFiles.includes(normalized)) {
        dirtyFiles.push(normalized);
      }
    }

    return dirtyFiles;
  } catch {
    return [];
  }
}

/**
 * Creates an exact backup of target files under .seo/backups/<timestamp>/
 * Returns the relative backup directory path.
 */
export function createBackup(
  projectRoot: string,
  relativeFilePaths: ReadonlyArray<string>,
  customTimestamp?: string,
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const timestamp =
    customTimestamp ??
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const relativeBackupDir = path.posix.join('.seo', 'backups', timestamp);
  const absoluteBackupDir = path.join(projectRoot, relativeBackupDir);

  if (!fs.existsSync(absoluteBackupDir)) {
    fs.mkdirSync(absoluteBackupDir, { recursive: true });
  }

  for (const relPath of relativeFilePaths) {
    const srcAbs = path.join(projectRoot, relPath);
    if (fs.existsSync(srcAbs)) {
      const destAbs = path.join(absoluteBackupDir, relPath);
      const destDir = path.dirname(destAbs);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcAbs, destAbs);
    }
  }

  return relativeBackupDir;
}

/**
 * Performs an atomic write using a temporary sibling file and rename.
 */
export async function atomicWrite(targetPath: string, content: string): Promise<void> {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${targetPath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, targetPath);
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore cleanup error
      }
    }
    throw err;
  }
}

