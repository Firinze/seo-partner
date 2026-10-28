import path from 'node:path';
import type { ExtractedRouteData } from '@seo-partner/core';

export interface ExtractedLayoutData {
  readonly filePath: string;
  readonly htmlLang?: { readonly value: string; readonly line: number } | null;
  readonly title?: { readonly value: string; readonly line: number } | null;
  readonly description?: { readonly value: string; readonly line: number } | null;
  readonly canonical?: { readonly value: string; readonly line: number } | null;
  readonly robots?: { readonly value: string; readonly line: number } | null;
}

export class LayoutResolver {
  private readonly layoutsByPath = new Map<string, ExtractedLayoutData>();

  public registerLayout(layout: ExtractedLayoutData): void {
    const normalized = layout.filePath.replace(/\\/g, '/');
    this.layoutsByPath.set(normalized, layout);
  }

  public getLayout(filePath: string): ExtractedLayoutData | undefined {
    const normalized = filePath.replace(/\\/g, '/');
    return this.layoutsByPath.get(normalized);
  }

  /**
   * Applies layout inheritance to an extracted route if the route lacks metadata
   * (such as htmlLang or fallback title).
   */
  public applyInheritance(
    routeData: ExtractedRouteData,
    parentLayoutPaths: ReadonlyArray<string>,
  ): ExtractedRouteData {
    let htmlLang = routeData.htmlLang;
    let title = routeData.title;
    let description = routeData.description;
    let canonical = routeData.canonical;
    let robots = routeData.robots;

    // Traverse from nearest layout to root layout
    for (const layoutPath of parentLayoutPaths) {
      const layout = this.getLayout(layoutPath);
      if (!layout) continue;

      if (!htmlLang && layout.htmlLang) {
        htmlLang = layout.htmlLang;
      }
      if (!title && layout.title) {
        title = layout.title;
      }
      if (!description && layout.description) {
        description = layout.description;
      }
      if (!canonical && layout.canonical) {
        canonical = layout.canonical;
      }
      if (!robots && layout.robots) {
        robots = layout.robots;
      }
    }

    return {
      ...routeData,
      htmlLang,
      title,
      description,
      canonical,
      robots,
    };
  }

  /**
   * Finds candidate SvelteKit layout paths (+layout.svelte) starting from the page directory
   * up to the routes root directory.
   */
  public findSvelteKitLayoutPaths(pageFilePath: string): ReadonlyArray<string> {
    const normalized = pageFilePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const routesIdx = parts.lastIndexOf('routes');
    if (routesIdx === -1) return [];

    const candidates: string[] = [];
    const dirParts = parts.slice(0, -1);

    // From current dir up to routes directory
    for (let i = dirParts.length; i >= routesIdx; i--) {
      const dir = dirParts.slice(0, i).join('/');
      candidates.push(`${dir}/+layout.svelte`);
    }

    return candidates;
  }

  /**
   * Resolves Django base template paths (e.g. "base.html" or "layouts/base.html").
   */
  public findDjangoExtendsPath(
    templateContent: string,
    allTemplatePaths: ReadonlyArray<string>,
  ): string | undefined {
    const extendsMatch = templateContent.match(/\{%\s*extends\s+['"]([^'"]+)['"]\s*%\}/i);
    if (!extendsMatch || !extendsMatch[1]) return undefined;

    const baseName = extendsMatch[1].replace(/\\/g, '/');
    // Match against known templates
    return allTemplatePaths.find((p) => {
      const norm = p.replace(/\\/g, '/');
      return norm.endsWith(baseName) || norm === baseName;
    });
  }
}

