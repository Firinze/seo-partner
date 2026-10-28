import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';
import type { AdapterCapabilities, FrameworkAdapter } from './contract.js';
import {
  detectRenderingModeFromTsx,
  parseTsxRouteFile,
} from './parsers/tsx-ast-parser.js';

const PRIVATE_ROUTE_PREFIXES = ['/admin', '/dashboard', '/login', '/auth', '/api', '/account'];

export function isPrivateRoutePattern(pattern: string): boolean {
  const lower = pattern.toLowerCase();
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => lower === prefix || lower.startsWith(`${prefix}/`),
  );
}

export function appRouterPathToPattern(relPath: string): string {
  const withoutPrefix = relPath.replace(/^(src\/)?app\//, '');
  const withoutPage = withoutPrefix.replace(/\/?page\.(tsx|ts|jsx|js|mdx)$/, '');
  const segments = withoutPage
    .split('/')
    .filter((s) => s.length > 0 && !(s.startsWith('(') && s.endsWith(')')));
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

export function pagesRouterPathToPattern(relPath: string): string {
  const withoutPrefix = relPath.replace(/^(src\/)?pages\//, '');
  const withoutExt = withoutPrefix.replace(/\.(tsx|ts|jsx|js)$/, '');
  if (withoutExt === 'index') return '/';
  const cleaned = withoutExt.replace(/\/index$/, '');
  return `/${cleaned}`;
}

export class NextJsAdapter implements FrameworkAdapter {
  public readonly id = 'nextjs';
  public readonly name = 'Next.js (App Router & Pages Router)';
  public readonly version = '1.0' as const;
  public readonly capabilities: AdapterCapabilities = {
    routes: true,
    metadata: true,
    headings: true,
    internalLinks: true,
    jsonLd: true,
    images: true,
    robotsAndSitemap: true,
  };

  public async detect(
    _projectRoot: string,
    filePaths: ReadonlyArray<string>,
    contentsByPath: ReadonlyMap<string, string>,
  ): Promise<boolean> {
    const pkgJson = contentsByPath.get('package.json');
    if (pkgJson && /"next"\s*:/.test(pkgJson)) {
      return true;
    }
    return filePaths.some(
      (p) =>
        /^next\.config\.(js|mjs|ts|cjs)$/.test(p) ||
        /^(src\/)?app\/.*page\.(tsx|ts|jsx|js)$/.test(p) ||
        /^(src\/)?pages\/.*\.(tsx|ts|jsx|js)$/.test(p),
    );
  }

  public async discoverRoutes(
    _projectRoot: string,
    filePaths: ReadonlyArray<string>,
    contentsByPath: ReadonlyMap<string, string>,
    sitemapPaths: ReadonlySet<string>,
  ): Promise<ReadonlyArray<DiscoveredRoute>> {
    const routes: DiscoveredRoute[] = [];

    for (const filePath of filePaths) {
      if (/^(src\/)?app\/(.*\/)?page\.(tsx|ts|jsx|js)$/.test(filePath)) {
        const pattern = appRouterPathToPattern(filePath);
        const content = contentsByPath.get(filePath) ?? '';
        routes.push({
          pattern,
          filePath,
          routerKind: 'nextjs-app',
          renderingMode: detectRenderingModeFromTsx(content),
          isPrivate: isPrivateRoutePattern(pattern),
          inSitemap: sitemapPaths.has(pattern),
        });
      } else if (
        /^(src\/)?pages\/.*\.(tsx|ts|jsx|js)$/.test(filePath) &&
        !/\/_app\./.test(filePath) &&
        !/\/_document\./.test(filePath) &&
        !/\/_error\./.test(filePath) &&
        !/^(src\/)?pages\/api\//.test(filePath)
      ) {
        const pattern = pagesRouterPathToPattern(filePath);
        const content = contentsByPath.get(filePath) ?? '';
        routes.push({
          pattern,
          filePath,
          routerKind: 'nextjs-pages',
          renderingMode: detectRenderingModeFromTsx(content),
          isPrivate: isPrivateRoutePattern(pattern),
          inSitemap: sitemapPaths.has(pattern),
        });
      }
    }

    return routes;
  }

  public async extractRoute(
    _projectRoot: string,
    route: DiscoveredRoute,
    fileContent: string,
  ): Promise<ExtractedRouteData> {
    return parseTsxRouteFile(route, fileContent);
  }
}

