import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type DiscoveredRoute,
  type ScannedFile,
  walkProjectFiles,
} from '@seo-partner/core';
import {
  NextJsAdapter,
  StaticAdapter,
  parseRobotsFiles,
  parseSitemapFiles,
  parseStaticHtmlOrMarkdown,
} from '@seo-partner/adapters';

describe('US2: NextJsAdapter (App & Pages Router) and StaticAdapter', () => {
  it('detects Next.js App Router routes, metadata, headings, images, links, and JSON-LD with exact line numbers', async () => {
    const root = path.resolve('tests/fixtures/nextjs-app-sample');
    const walkRes = await walkProjectFiles({
      projectRoot: root,
      projectId: 'proj_app',
    });
    const filePaths = walkRes.files.map((f: ScannedFile) => f.path);
    const robots = parseRobotsFiles(filePaths, walkRes.contentsByPath);
    const sitemap = parseSitemapFiles(filePaths, walkRes.contentsByPath);

    expect(robots.exists).toBe(true);
    expect(sitemap.exists).toBe(true);
    expect(sitemap.routePaths.has('/dashboard')).toBe(true);

    const adapter = new NextJsAdapter();
    expect(await adapter.detect(root, filePaths, walkRes.contentsByPath)).toBe(true);

    const routes = await adapter.discoverRoutes(
      root,
      filePaths,
      walkRes.contentsByPath,
      sitemap.routePaths,
    );
    expect(routes.map((r: DiscoveredRoute) => r.pattern).sort()).toEqual([
      '/',
      '/about',
      '/dashboard',
      '/pricing',
    ]);

    const homeRoute = routes.find((r: DiscoveredRoute) => r.pattern === '/')!;
    const homeData = await adapter.extractRoute(
      root,
      homeRoute,
      walkRes.contentsByPath.get(homeRoute.filePath) ?? '',
    );
    expect(homeData.title?.value).toContain('Agences SEO Local');
    expect(homeData.title?.line).toBe(4);
    expect(homeData.canonical?.value).toBe('https://example.com/');
    expect(homeData.headings).toHaveLength(1);
    expect(homeData.images[0]?.hasAlt).toBe(true);
    expect(homeData.jsonLdItems[0]?.isValid).toBe(true);

    const pricingRoute = routes.find((r: DiscoveredRoute) => r.pattern === '/pricing')!;
    const pricingData = await adapter.extractRoute(
      root,
      pricingRoute,
      walkRes.contentsByPath.get(pricingRoute.filePath) ?? '',
    );
    expect(pricingData.robots?.value).toContain('noindex');
    expect(
      pricingData.headings.filter((h: { level: number }) => h.level === 1),
    ).toHaveLength(2);
    expect(pricingData.images[0]?.hasAlt).toBe(false);
    expect(pricingData.jsonLdItems[0]?.isValid).toBe(false);
  });

  it('extracts Next.js Pages Router <Head> metadata and Static HTML/Markdown', async () => {
    const pagesRoot = path.resolve('tests/fixtures/nextjs-pages-sample');
    const walkRes = await walkProjectFiles({
      projectRoot: pagesRoot,
      projectId: 'proj_pages',
    });
    const filePaths = walkRes.files.map((f: ScannedFile) => f.path);
    const adapter = new NextJsAdapter();
    const routes = await adapter.discoverRoutes(
      pagesRoot,
      filePaths,
      walkRes.contentsByPath,
      new Set(),
    );
    expect(routes).toHaveLength(1);
    expect(routes[0]?.pattern).toBe('/');

    const indexData = await adapter.extractRoute(
      pagesRoot,
      routes[0]!,
      walkRes.contentsByPath.get(routes[0]!.filePath) ?? '',
    );
    expect(indexData.title?.value).toContain('Guide Complet du Referencement Technique');
    expect(indexData.canonical?.value).toBe('https://blog.example.com/');

    const staticAdapter = new StaticAdapter();
    expect(await staticAdapter.detect(pagesRoot, ['public/landing.html'])).toBe(true);
    const htmlExtracted = parseStaticHtmlOrMarkdown(
      {
        pattern: '/landing',
        filePath: 'public/landing.html',
        routerKind: 'static-html',
        renderingMode: 'static',
        isPrivate: false,
        inSitemap: false,
      },
      `<!doctype html>
<html>
<head>
  <title>Static Landing Page Title With More Than Fifty Characters</title>
  <meta name="description" content="Description de page statique"/>
  <link rel="canonical" href="https://example.com/landing"/>
</head>
<body>
  <h1>Titre Principal Statique</h1>
  <img src="/banner.webp" alt="Banniere"/>
  <a href="/contact">Contact</a>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
</body>
</html>`,
    );
    expect(htmlExtracted.title?.line).toBe(4);
    expect(htmlExtracted.headings[0]?.text).toBe('Titre Principal Statique');
    expect(htmlExtracted.jsonLdItems[0]?.isValid).toBe(true);
  });
});
