import path from 'node:path';
import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';
import type { AdapterCapabilities, AdapterVersion, FrameworkAdapter } from './contract.js';
import { parseAstroOrMarkdown } from './parsers/astro-parser.js';
import { normalizeRoutePattern } from './parsers/route-normalizer.js';
import { LayoutResolver } from './parsers/layout-resolver.js';

export class AstroAdapter implements FrameworkAdapter {
  public readonly id = 'astro';
  public readonly name = 'Astro';
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
        normalized === 'astro.config.mjs' ||
        normalized === 'astro.config.ts' ||
        normalized === 'astro.config.js' ||
        normalized === 'astro.config.cjs'
      ) {
        return true;
      }
      if (normalized === 'package.json') {
        const content = contentsByPath.get(filePath) ?? '';
        if (content.includes('"astro"') || content.includes('"@astrojs/')) {
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

    // Pre-cache layouts from src/layouts/**
    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (normalized.startsWith('src/layouts/') && normalized.endsWith('.astro')) {
        const content = contentsByPath.get(filePath) ?? '';
        const parsed = parseAstroOrMarkdown(
          {
            pattern: '',
            filePath,
            routerKind: 'astro',
            renderingMode: 'static',
            isPrivate: false,
            inSitemap: false,
          },
          content,
        );
        this.layoutResolver.registerLayout({
          filePath,
          htmlLang: parsed.routeData.htmlLang,
          title: parsed.routeData.title,
          description: parsed.routeData.description,
          canonical: parsed.routeData.canonical,
          robots: parsed.routeData.robots,
        });
      }
    }

    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (!normalized.startsWith('src/pages/')) continue;
      if (!/\.(astro|md|mdx|html)$/i.test(normalized)) continue;

      const relativeInsidePages = normalized.slice('src/pages/'.length);
      const pattern = normalizeRoutePattern(relativeInsidePages, 'astro');
      const inSitemap = sitemapPaths.has(pattern);

      routes.push({
        pattern,
        filePath,
        routerKind: 'astro',
        renderingMode: 'static',
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
    const parsed = parseAstroOrMarkdown(route, fileContent);
    let extracted = parsed.routeData;

    // Apply layout inheritance: check layout candidates
    const layoutCandidates = [
      'src/layouts/BaseLayout.astro',
      'src/layouts/Layout.astro',
      'src/layouts/MainLayout.astro',
      'src/layouts/DefaultLayout.astro',
    ];
    extracted = this.layoutResolver.applyInheritance(extracted, layoutCandidates);

    return extracted;
  }
}

