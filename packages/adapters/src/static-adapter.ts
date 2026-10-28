import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';
import type { AdapterCapabilities, FrameworkAdapter } from './contract.js';
import { isPrivateRoutePattern } from './nextjs-adapter.js';
import { parseStaticHtmlOrMarkdown } from './parsers/html-parser.js';

export class StaticAdapter implements FrameworkAdapter {
  public readonly id = 'static-html';
  public readonly name = 'Static HTML & Markdown';
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
  ): Promise<boolean> {
    return filePaths.some((p) => p.endsWith('.html'));
  }

  public async discoverRoutes(
    _projectRoot: string,
    filePaths: ReadonlyArray<string>,
    _contentsByPath: ReadonlyMap<string, string>,
    sitemapPaths: ReadonlySet<string>,
  ): Promise<ReadonlyArray<DiscoveredRoute>> {
    const routes: DiscoveredRoute[] = [];
    for (const filePath of filePaths) {
      if (filePath.endsWith('.html')) {
        const clean = filePath
          .replace(/^public\//, '')
          .replace(/index\.html$/, '')
          .replace(/\.html$/, '');
        const pattern = clean.startsWith('/') ? clean : `/${clean}`;
        routes.push({
          pattern: pattern === '' ? '/' : pattern,
          filePath,
          routerKind: 'static-html',
          renderingMode: 'static',
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
    return parseStaticHtmlOrMarkdown(route, fileContent);
  }
}

