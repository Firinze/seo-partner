import path from 'node:path';
import type { DiscoveredRoute, ExtractedRouteData } from '@seo-partner/core';
import type { AdapterCapabilities, AdapterVersion, FrameworkAdapter } from './contract.js';
import { parseDjangoUrls, parseDjangoViews } from './parsers/python-url-parser.js';
import { parseDjangoTemplate } from './parsers/dtl-parser.js';
import { LayoutResolver } from './parsers/layout-resolver.js';

export class DjangoAdapter implements FrameworkAdapter {
  public readonly id = 'django';
  public readonly name = 'Django';
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
        normalized === 'manage.py' ||
        normalized.endsWith('/manage.py') ||
        normalized === 'wsgi.py' ||
        normalized.endsWith('/wsgi.py') ||
        normalized === 'asgi.py' ||
        normalized.endsWith('/asgi.py') ||
        normalized.endsWith('settings.py')
      ) {
        return true;
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

    // 1. Pre-cache all base templates (e.g. templates/base.html, templates/*/base.html)
    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (normalized.endsWith('.html')) {
        const content = contentsByPath.get(filePath) ?? '';
        if (
          normalized.endsWith('base.html') ||
          content.includes('<!DOCTYPE html>') ||
          content.includes('<html')
        ) {
          const parsed = parseDjangoTemplate(
            {
              pattern: '',
              filePath,
              routerKind: 'django',
              renderingMode: 'dynamic',
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
    }

    // 2. Parse all views.py to build viewName -> templateName mapping
    const viewToTemplate = new Map<string, string>();
    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (normalized.endsWith('views.py')) {
        const content = contentsByPath.get(filePath) ?? '';
        const mappings = parseDjangoViews(content);
        for (const m of mappings) {
          viewToTemplate.set(m.viewName, m.templateName);
        }
      }
    }

    // 3. Parse all urls.py to discover routes
    for (const filePath of filePaths) {
      const normalized = filePath.replace(/\\/g, '/');
      if (!normalized.endsWith('urls.py')) continue;

      const content = contentsByPath.get(filePath) ?? '';
      const patterns = parseDjangoUrls(content);

      for (const p of patterns) {
        const targetTemplateName = viewToTemplate.get(p.viewName);
        let resolvedFilePath = filePath;

        if (targetTemplateName) {
          // Find matching template in filePaths
          const found = filePaths.find((fp) => {
            const norm = fp.replace(/\\/g, '/');
            return norm.endsWith(`/${targetTemplateName}`) || norm === targetTemplateName;
          });
          if (found) {
            resolvedFilePath = found;
          }
        } else {
          // Conventional fallback: check for templates/<viewName>.html
          const fallback = filePaths.find((fp) => {
            const norm = fp.replace(/\\/g, '/');
            return (
              norm.endsWith(`/${p.viewName}.html`) ||
              norm.endsWith(`templates/${p.viewName}.html`)
            );
          });
          if (fallback) {
            resolvedFilePath = fallback;
          }
        }

        const inSitemap = sitemapPaths.has(p.pattern) || sitemapPaths.has(`${p.pattern}/`);

        routes.push({
          pattern: p.pattern,
          filePath: resolvedFilePath,
          routerKind: 'django',
          renderingMode: 'dynamic',
          isPrivate: false,
          inSitemap,
        });
      }
    }

    return routes;
  }

  public async extractRoute(
    projectRoot: string,
    route: DiscoveredRoute,
    fileContent: string,
  ): Promise<ExtractedRouteData> {
    const parsed = parseDjangoTemplate(route, fileContent);
    let extracted = parsed.routeData;

    // Resolve base template inheritance
    const candidates: string[] = [];
    if (parsed.extendsTemplate) {
      candidates.push(parsed.extendsTemplate);
      candidates.push(`templates/${parsed.extendsTemplate}`);
    }
    candidates.push('templates/base.html');
    candidates.push('base.html');

    extracted = this.layoutResolver.applyInheritance(extracted, candidates);

    return extracted;
  }
}

