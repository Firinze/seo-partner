import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadGitignorePatterns, shouldExcludePath } from './gitignore-guard.js';
import type { FileKind, ScannedFile } from './types.js';

export interface WalkOptions {
  readonly projectRoot: string;
  readonly projectId: string;
  readonly scopeDir?: string;
  readonly maxFileSizeKb?: number;
  readonly extraExcludePatterns?: ReadonlyArray<string>;
  readonly existingFilesByPath?: ReadonlyMap<string, ScannedFile>;
}

export interface WalkResult {
  readonly files: ReadonlyArray<ScannedFile>;
  readonly contentsByPath: ReadonlyMap<string, string>;
  readonly changedPaths: ReadonlySet<string>;
  readonly reusedPaths: ReadonlySet<string>;
  readonly purgedPaths: ReadonlySet<string>;
  readonly skippedSecretOrIgnoredCount: number;
  readonly skippedOversizedCount: number;
}

export function classifyFileKind(relativePathPosix: string): FileKind {
  const lower = relativePathPosix.toLowerCase();
  const base = path.posix.basename(lower);

  if (base === 'robots.txt' || base === 'robots.ts' || base === 'robots.js') {
    return 'robots';
  }
  if (
    base === 'sitemap.xml' ||
    base === 'sitemap.ts' ||
    base === 'sitemap.js' ||
    base.startsWith('sitemap')
  ) {
    return 'sitemap';
  }
  if (
    base === 'package.json' ||
    base === 'composer.json' ||
    base === 'artisan' ||
    base.startsWith('next.config.') ||
    base === 'tsconfig.json' ||
    lower === 'routes/web.php' ||
    lower === 'config/routes.yaml'
  ) {
    return 'config';
  }
  if (
    /^(layout|root)\.(tsx|ts|jsx|js)$/.test(base) ||
    lower.includes('layouts/') ||
    base === 'base.html.twig' ||
    base === 'header.php' ||
    base === 'head.php'
  ) {
    return 'layout';
  }
  if (
    /^(page|index)\.(tsx|ts|jsx|js|html|md|mdx|php)$/.test(base) ||
    lower.startsWith('pages/') ||
    lower.startsWith('src/pages/') ||
    lower.startsWith('src/controller/') ||
    lower.endsWith('.blade.php') ||
    lower.endsWith('.html.twig') ||
    lower.endsWith('.php') ||
    lower.endsWith('.html') ||
    lower.endsWith('.md') ||
    lower.endsWith('.mdx')
  ) {
    return 'route';
  }
  if (lower.startsWith('public/')) {
    return 'static';
  }
  return 'other';
}

export async function walkProjectFiles(options: WalkOptions): Promise<WalkResult> {
  const rootResolved = path.resolve(options.projectRoot);
  const startDir = options.scopeDir
    ? path.resolve(rootResolved, options.scopeDir)
    : rootResolved;
  const maxBytes = (options.maxFileSizeKb ?? 1024) * 1024;
  const gitignorePatterns = [
    ...loadGitignorePatterns(rootResolved),
    ...(options.extraExcludePatterns ?? []),
  ];
  const existingMap = options.existingFilesByPath;

  const files: ScannedFile[] = [];
  const contentsByPath = new Map<string, string>();
  const changedPaths = new Set<string>();
  const reusedPaths = new Set<string>();
  const seenPaths = new Set<string>();
  let skippedSecretOrIgnoredCount = 0;
  let skippedOversizedCount = 0;
  const scannedAt = new Date().toISOString();

  async function processFile(fullPath: string, relPosix: string): Promise<void> {
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(fullPath);
    } catch {
      return;
    }

    if (stat.size > maxBytes) {
      skippedOversizedCount += 1;
      return;
    }

    seenPaths.add(relPosix);
    const mtimeMs = Math.floor(stat.mtimeMs);
    const sizeBytes = stat.size;
    const kind = classifyFileKind(relPosix);
    const prev = existingMap?.get(relPosix);

    // Fast path for non-SEO-extracted files ('other' / 'static') when mtime and size are identical
    if (
      prev &&
      prev.mtimeMs === mtimeMs &&
      prev.sizeBytes === sizeBytes &&
      (kind === 'other' || kind === 'static')
    ) {
      reusedPaths.add(relPosix);
      files.push({
        id: prev.id,
        projectId: options.projectId,
        path: relPosix,
        hash: prev.hash,
        mtimeMs,
        sizeBytes,
        kind,
        scannedAt: prev.scannedAt,
      });
      return;
    }

    const rawBuffer = await fs.promises.readFile(fullPath);
    const hash = crypto.createHash('sha256').update(rawBuffer).digest('hex');

    if (prev && prev.hash === hash) {
      reusedPaths.add(relPosix);
      files.push({
        id: prev.id,
        projectId: options.projectId,
        path: relPosix,
        hash,
        mtimeMs,
        sizeBytes,
        kind,
        scannedAt: prev.scannedAt,
      });
    } else {
      changedPaths.add(relPosix);
      files.push({
        id: prev?.id,
        projectId: options.projectId,
        path: relPosix,
        hash,
        mtimeMs,
        sizeBytes,
        kind,
        scannedAt,
      });
    }

    if (kind !== 'other') {
      contentsByPath.set(relPosix, rawBuffer.toString('utf-8'));
    }
  }

  async function walkDirectory(currentDir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const subDirs: string[] = [];
    const fileTasks: Array<Promise<void>> = [];

    for (const dirent of entries) {
      const fullPath = path.join(currentDir, dirent.name);
      const relPosix = path.relative(rootResolved, fullPath).split(path.sep).join('/');

      const exclusion = shouldExcludePath(relPosix, gitignorePatterns);
      if (exclusion.excluded) {
        skippedSecretOrIgnoredCount += 1;
        continue;
      }

      if (dirent.isDirectory()) {
        subDirs.push(fullPath);
      } else if (dirent.isFile()) {
        fileTasks.push(processFile(fullPath, relPosix));
      }
    }

    if (fileTasks.length > 0) {
      await Promise.all(fileTasks);
    }
    const DIR_BATCH_SIZE = 16;
    for (let i = 0; i < subDirs.length; i += DIR_BATCH_SIZE) {
      await Promise.all(subDirs.slice(i, i + DIR_BATCH_SIZE).map((sd) => walkDirectory(sd)));
    }
  }

  await walkDirectory(startDir);
  files.sort((a, b) => a.path.localeCompare(b.path));

  const purgedPaths = new Set<string>();
  if (existingMap) {
    for (const oldPath of existingMap.keys()) {
      if (!seenPaths.has(oldPath)) {
        purgedPaths.add(oldPath);
      }
    }
  }

  return {
    files,
    contentsByPath,
    changedPaths,
    reusedPaths,
    purgedPaths,
    skippedSecretOrIgnoredCount,
    skippedOversizedCount,
  };
}
