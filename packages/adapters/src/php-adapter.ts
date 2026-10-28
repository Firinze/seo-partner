import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';
import type { AdapterCapabilities, FrameworkAdapter } from './contract.js';
import { isPrivateRoutePattern } from './nextjs-adapter.js';
import {
  detectPhpFlavor,
  discoverNativePhpRoutes,
  parseLaravelRoutes,
  parseSymfonyRoutes,
} from './parsers/php-route-parser.js';
import { parsePhpOrTemplateFile } from './parsers/php-template-parser.js';

export class PhpAdapter implements FrameworkAdapter {
  public readonly id = 'php';
  public readonly name = 'PHP Ecosystem (Laravel / Blade, Symfony / Twig, Native PHP / Laragon)';
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
    return detectPhpFlavor(filePaths, contentsByPath) !== null;
  }

  public async discoverRoutes(
    _projectRoot: string,
    filePaths: ReadonlyArray<string>,
    contentsByPath: ReadonlyMap<string, string>,
    sitemapPaths: ReadonlySet<string>,
  ): Promise<ReadonlyArray<DiscoveredRoute>> {
    const flavor = detectPhpFlavor(filePaths, contentsByPath);
    if (!flavor) return [];

    const entries =
      flavor === 'laravel'
        ? parseLaravelRoutes(filePaths, contentsByPath)
        : flavor === 'symfony'
          ? parseSymfonyRoutes(filePaths, contentsByPath)
          : discoverNativePhpRoutes(filePaths);

    return entries.map((entry) => ({
      pattern: entry.pattern,
      filePath: entry.filePath,
      routerKind: entry.flavor,
      renderingMode: 'ssr-ssg',
      isPrivate: isPrivateRoutePattern(entry.pattern),
      inSitemap: sitemapPaths.has(entry.pattern),
    }));
  }

  public async extractRoute(
    projectRoot: string,
    route: DiscoveredRoute,
    fileContent: string,
  ): Promise<ExtractedRouteData> {
    return parsePhpOrTemplateFile(projectRoot, route, fileContent);
  }
}

