import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';

export type AdapterVersion = '1.0';

export interface AdapterCapabilities {
  readonly routes: boolean;
  readonly metadata: boolean;
  readonly headings: boolean;
  readonly internalLinks: boolean;
  readonly jsonLd: boolean;
  readonly images: boolean;
  readonly robotsAndSitemap: boolean;
}

export interface FrameworkAdapter {
  readonly id: string;
  readonly name: string;
  readonly version: AdapterVersion;
  readonly capabilities: AdapterCapabilities;

  detect(
    projectRoot: string,
    filePaths: ReadonlyArray<string>,
    contentsByPath: ReadonlyMap<string, string>,
  ): Promise<boolean>;

  discoverRoutes(
    projectRoot: string,
    filePaths: ReadonlyArray<string>,
    contentsByPath: ReadonlyMap<string, string>,
    sitemapPaths: ReadonlySet<string>,
  ): Promise<ReadonlyArray<DiscoveredRoute>>;

  extractRoute(
    projectRoot: string,
    route: DiscoveredRoute,
    fileContent: string,
  ): Promise<ExtractedRouteData>;
}

