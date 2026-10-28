import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';
import type { AdapterCapabilities, AdapterVersion, FrameworkAdapter } from './contract.js';
import { parseSvelteComponent } from './parsers/svelte-parser.js';
import { normalizeRoutePattern } from './parsers/route-normalizer.js';
import { LayoutResolver } from './parsers/layout-resolver.js';

export class SvelteKitAdapter implements FrameworkAdapter {
  public readonly id = 'sveltekit';
  public readonly name = 'SvelteKit';
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
        normalized === 'svelte.config.js' ||
        normalized === 'svelte.config.ts' ||
        normalized === 'svelte.config.mjs' ||
        normalized === 'svelte.config.cjs'
      ) {
        return true;
      }
      if (normalized === 'package.json') {
        const content = contentsByPath.get(filePath) ?? '';
        if (content.includes('"@sveltejs/kit"')) {
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

    // Pre-cache layouts from src/routes/**/+layout.svelte
    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (normalized.startsWith('src/routes/') && normalized.endsWith('+layout.svelte')) {
        const content = contentsByPath.get(filePath) ?? '';
        const parsed = parseSvelteComponent(
          {
            pattern: '',
            filePath,
            routerKind: 'sveltekit',
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
      if (!normalized.startsWith('src/routes/')) continue;
      if (!normalized.endsWith('+page.svelte')) continue;

      const relativeInsideRoutes = normalized.slice('src/routes/'.length);
      const pattern = normalizeRoutePattern(relativeInsideRoutes, 'sveltekit');
      const inSitemap = sitemapPaths.has(pattern);

      routes.push({
        pattern,
        filePath,
        routerKind: 'sveltekit',
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
    let extracted = parseSvelteComponent(route, fileContent);

    // Apply hierarchical layout inheritance from leaf up to root
    const parentLayouts = this.layoutResolver.findSvelteKitLayoutPaths(route.filePath);
    extracted = this.layoutResolver.applyInheritance(extracted, parentLayouts);

    return extracted;
  }
}

