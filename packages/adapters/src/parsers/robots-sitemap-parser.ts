export interface RobotsInfo {
  readonly exists: boolean;
  readonly filePath: string | null;
  readonly hasUserAgent: boolean;
  readonly sitemapUrls: ReadonlyArray<string>;
  readonly disallowPaths: ReadonlyArray<string>;
}

export interface SitemapInfo {
  readonly exists: boolean;
  readonly filePath: string | null;
  readonly routePaths: ReadonlySet<string>;
}

export function parseRobotsFiles(
  filePaths: ReadonlyArray<string>,
  contentsByPath: ReadonlyMap<string, string>,
): RobotsInfo {
  const robotsPath = filePaths.find(
    (p) =>
      p === 'public/robots.txt' ||
      p === 'robots.txt' ||
      p === 'src/app/robots.ts' ||
      p === 'src/app/robots.js' ||
      p === 'app/robots.ts' ||
      p === 'app/robots.js',
  );

  if (!robotsPath) {
    return {
      exists: false,
      filePath: null,
      hasUserAgent: false,
      sitemapUrls: [],
      disallowPaths: [],
    };
  }

  const content = contentsByPath.get(robotsPath) ?? '';
  const sitemapUrls: string[] = [];
  const disallowPaths: string[] = [];
  let hasUserAgent = false;

  if (robotsPath.endsWith('.txt')) {
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (/^user-agent:/i.test(trimmed)) {
        hasUserAgent = true;
      } else if (/^sitemap:/i.test(trimmed)) {
        sitemapUrls.push(trimmed.replace(/^sitemap:\s*/i, '').trim());
      } else if (/^disallow:/i.test(trimmed)) {
        const p = trimmed.replace(/^disallow:\s*/i, '').trim();
        if (p) disallowPaths.push(p);
      }
    }
  } else {
    hasUserAgent = /userAgent/i.test(content);
    const smMatch = /sitemap:\s*['"]([^'"]+)['"]/i.exec(content);
    if (smMatch?.[1]) sitemapUrls.push(smMatch[1]);
  }

  return {
    exists: true,
    filePath: robotsPath,
    hasUserAgent,
    sitemapUrls,
    disallowPaths,
  };
}

export function parseSitemapFiles(
  filePaths: ReadonlyArray<string>,
  contentsByPath: ReadonlyMap<string, string>,
): SitemapInfo {
  const sitemapPath = filePaths.find(
    (p) =>
      p === 'public/sitemap.xml' ||
      p === 'sitemap.xml' ||
      p === 'src/app/sitemap.ts' ||
      p === 'src/app/sitemap.js' ||
      p === 'app/sitemap.ts' ||
      p === 'app/sitemap.js',
  );

  if (!sitemapPath) {
    return {
      exists: false,
      filePath: null,
      routePaths: new Set(),
    };
  }

  const content = contentsByPath.get(sitemapPath) ?? '';
  const routePaths = new Set<string>();

  const locRegex = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRegex.exec(content)) !== null) {
    const rawUrl = m[1] ?? '';
    try {
      const u = new URL(rawUrl);
      routePaths.add(u.pathname || '/');
    } catch {
      if (rawUrl.startsWith('/')) routePaths.add(rawUrl);
    }
  }

  const urlPropRegex = /url:\s*[`'"]([^`'"]+)[`'"]/g;
  while ((m = urlPropRegex.exec(content)) !== null) {
    const rawUrl = m[1] ?? '';
    try {
      const u = new URL(rawUrl);
      routePaths.add(u.pathname || '/');
    } catch {
      const slashIdx = rawUrl.indexOf('/');
      if (slashIdx >= 0) {
        routePaths.add(rawUrl.slice(slashIdx));
      }
    }
  }

  return {
    exists: true,
    filePath: sitemapPath,
    routePaths,
  };
}

