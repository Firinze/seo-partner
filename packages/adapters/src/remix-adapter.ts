import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';
import type { AdapterCapabilities, AdapterVersion, FrameworkAdapter } from './contract.js';
import { parseRemixRoute } from './parsers/remix-parser.js';
import { normalizeRoutePattern } from './parsers/route-normalizer.js';
import { LayoutResolver } from './parsers/layout-resolver.js';

export class RemixAdapter implements FrameworkAdapter {
  public readonly id = 'remix';
  public readonly name = 'Remix / React Router v7';
  public readonly version: AdapterVersion = '1.0';
  public readonly capabilities: AdapterCapabilities = {
    routes: true,
    metadata: true,
    headings: true,
    internalLinks: true,
    jsonLd: true,
    images: true,
    robotsAndSitemap: true,
  };

  private readonly layoutResolver = new LayoutResolver();

  public async detect(
    projectRoot: string,
    filePaths: ReadonlyArray<string>,
    contentsByPath: ReadonlyMap<string, string>,
  ): Promise<boolean> {
    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (
        normalized === 'remix.config.js' ||
        normalized === 'remix.config.ts' ||
        normalized === 'remix.config.mjs' ||
        normalized === 'react-router.config.ts' ||
        normalized === 'react-router.config.js'
      ) {
        return true;
      }
      if (normalized === 'package.json') {
        const content = contentsByPath.get(filePath) ?? '';
        if (
          content.includes('"@remix-run/') ||
          content.includes('"react-router"')
        ) {
          return true;
        }
      }
    }
    return false;
  }

  public async discoverRoutes(
    projectRoot: string,
    filePaths: ReadonlyArray<string>,
    contentsByPath: ReadonlyMap<string, string>,
    sitemapPaths: ReadonlySet<string>,
  ): Promise<ReadonlyArray<DiscoveredRoute>> {
    const routes: DiscoveredRoute[] = [];

    // Pre-cache root layout from app/root.tsx
    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (normalized === 'app/root.tsx' || normalized === 'app/root.jsx') {
        const content = contentsByPath.get(filePath) ?? '';
        const parsed = parseRemixRoute(
          {
            pattern: '',
            filePath,
            routerKind: 'remix',
            renderingMode: 'ssr-ssg',
            isPrivate: false,
            inSitemap: false,
          },
          content,
        );
        this.layoutResolver.registerLayout({
          filePath,
          htmlLang: parsed.htmlLang,
          title: parsed.title,
          description: parsed.description,
          canonical: parsed.canonical,
          robots: parsed.robots,
        });
      }
    }

    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (!normalized.startsWith('app/routes/')) continue;
      if (!/\.(tsx|jsx|ts|js)$/i.test(normalized)) continue;

      const relativeInsideRoutes = normalized.slice('app/routes/'.length);
      const pattern = normalizeRoutePattern(relativeInsideRoutes, 'remix');
      const inSitemap = sitemapPaths.has(pattern);

      routes.push({
        pattern,
        filePath,
        routerKind: 'remix',
        renderingMode: 'ssr-ssg',
        isPrivate: false,
        inSitemap,
      });
    }

    return routes;
  }

  public async extractRoute(
    projectRoot: string,
    route: DiscoveredRoute,
    fileContent: string,
  ): Promise<ExtractedRouteData> {
    let extracted = parseRemixRoute(route, fileContent);

    // Apply root layout inheritance
    const layoutCandidates = ['app/root.tsx', 'app/root.jsx'];
    extracted = this.layoutResolver.applyInheritance(extracted, layoutCandidates);

    return extracted;
  }
}

