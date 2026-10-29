import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';
import type { AdapterCapabilities, AdapterVersion, FrameworkAdapter } from './contract.js';
import { parseVueSfc } from './parsers/vue-sfc-parser.js';
import { normalizeRoutePattern } from './parsers/route-normalizer.js';
import { LayoutResolver } from './parsers/layout-resolver.js';

export class NuxtAdapter implements FrameworkAdapter {
  public readonly id = 'nuxt';
  public readonly name = 'Nuxt 3';
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
        normalized === 'nuxt.config.ts' ||
        normalized === 'nuxt.config.js' ||
        normalized === 'nuxt.config.mjs'
      ) {
        return true;
      }
      if (normalized === 'package.json') {
        const content = contentsByPath.get(filePath) ?? '';
        if (content.includes('"nuxt"') || content.includes('"@nuxt/')) {
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

    // Pre-cache layouts from layouts/**
    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (normalized.startsWith('layouts/') && normalized.endsWith('.vue')) {
        const content = contentsByPath.get(filePath) ?? '';
        const parsed = parseVueSfc(
          {
            pattern: '',
            filePath,
            routerKind: 'nuxt',
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
      if (!normalized.startsWith('pages/')) continue;
      if (!normalized.endsWith('.vue')) continue;

      const relativeInsidePages = normalized.slice('pages/'.length);
      const pattern = normalizeRoutePattern(relativeInsidePages, 'nuxt');
      const inSitemap = sitemapPaths.has(pattern);

      routes.push({
        pattern,
        filePath,
        routerKind: 'nuxt',
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
    let extracted = parseVueSfc(route, fileContent);

    // Inherit from default layout if present
    const layoutCandidates = ['layouts/default.vue', 'layouts/main.vue'];
    extracted = this.layoutResolver.applyInheritance(extracted, layoutCandidates);

    return extracted;
  }
}


export interface NuxtMetaFields {
  title?: string;
  description?: string;
  canonical?: string;
}

export function patchNuxtTemplate(
  sourceCode: string,
  meta: NuxtMetaFields,
): string {
  let result = sourceCode;

  const entries: string[] = [];
  if (meta.title) entries.push(`  title: '${meta.title.replace(/'/g, "\\'")}',`);
  if (meta.description) entries.push(`  description: '${meta.description.replace(/'/g, "\\'")}',`);
  if (meta.canonical) entries.push(`  canonical: '${meta.canonical}',`);

  const seoMetaCall = `useSeoMeta({\n${entries.join('\n')}\n});\n`;

  if (/<script\s+setup[^>]*>/i.test(result)) {
    if (!/useSeoMeta\s*\(/i.test(result)) {
      result = result.replace(/(<script\s+setup[^>]*>\s*\n)/i, `$1${seoMetaCall}`);
    }
  } else {
    result = `<script setup lang="ts">\n${seoMetaCall}</script>\n\n` + result;
  }

  return result;
}
