import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ExtractedRouteData } from '@seo-partner/core';
import { RouteRepository, SeoDatabase } from '@seo-partner/store';
import { AstroAdapter } from '../../packages/adapters/src/astro-adapter.js';
import { NuxtAdapter } from '../../packages/adapters/src/nuxt-adapter.js';
import { SvelteKitAdapter } from '../../packages/adapters/src/sveltekit-adapter.js';
import { RemixAdapter } from '../../packages/adapters/src/remix-adapter.js';
import { normalizeRoutePattern } from '../../packages/adapters/src/parsers/route-normalizer.js';

describe('Modern JS/TS Framework Adapters (Astro, Nuxt, SvelteKit, Remix)', () => {
  const tempDirs: string[] = [];

  function cloneFixtureToTemp(fixtureRelPath: string): string {
    const src = path.resolve(fixtureRelPath);
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-js-fixture-'));
    tempDirs.push(dest);
    fs.cpSync(src, dest, { recursive: true });
    return dest;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('Route Pattern Normalization', () => {
    it('normalizes various framework parameter conventions to :param and *rest', () => {
      expect(normalizeRoutePattern('src/pages/blog/[slug].astro', 'astro')).toBe('/blog/:slug');
      expect(normalizeRoutePattern('src/pages/docs/[...rest].astro', 'astro')).toBe('/docs/*rest');
      expect(normalizeRoutePattern('pages/produits/[id].vue', 'nuxt')).toBe('/produits/:id');
      expect(normalizeRoutePattern('pages/[...slug].vue', 'nuxt')).toBe('/*slug');
      expect(normalizeRoutePattern('src/routes/blog/[slug]/+page.svelte', 'sveltekit')).toBe('/blog/:slug');
      expect(normalizeRoutePattern('src/routes/[...rest]/+page.svelte', 'sveltekit')).toBe('/*rest');
      expect(normalizeRoutePattern('app/routes/blog.$slug.tsx', 'remix')).toBe('/blog/:slug');
      expect(normalizeRoutePattern('app/routes/_index.tsx', 'remix')).toBe('/');
      expect(normalizeRoutePattern('app/routes/docs.$.tsx', 'remix')).toBe('/docs/*');
    });
  });

  describe('AstroAdapter', () => {
    it('detects Astro, discovers routes, and extracts metadata with layout inheritance', async () => {
      const astroDir = cloneFixtureToTemp('tests/fixtures/astro-sample');
      const adapter = new AstroAdapter();

      const files = [
        'astro.config.mjs',
        'package.json',
        'src/layouts/BaseLayout.astro',
        'src/pages/index.astro',
        'src/pages/a-propos.astro',
        'src/pages/blog/[slug].astro',
        'src/pages/articles.md',
      ];
      const contentsByPath = new Map<string, string>();
      for (const f of files) {
        contentsByPath.set(f, fs.readFileSync(path.join(astroDir, f), 'utf-8'));
      }

      const detected = await adapter.detect(astroDir, files, contentsByPath);
      expect(detected).toBe(true);

      const routes = await adapter.discoverRoutes(astroDir, files, contentsByPath, new Set(['/']));
      expect(routes.map((r) => r.pattern).sort()).toEqual(['/', '/a-propos', '/articles', '/blog/:slug']);

      // Extract home route
      const homeRoute = routes.find((r) => r.pattern === '/')!;
      const homeData = await adapter.extractRoute(astroDir, homeRoute, contentsByPath.get(homeRoute.filePath)!);
      expect(homeData.title?.value).toBe('Accueil Astro');
      expect(homeData.htmlLang?.value).toBe('fr'); // Inherited from BaseLayout.astro
      expect(homeData.headings.length).toBeGreaterThan(0);
      expect(homeData.headings[0]?.text).toBe('Accueil officiel Astro');
      expect(homeData.headings[0]?.line).toBeGreaterThanOrEqual(1);

      // Extract dynamic route
      const blogRoute = routes.find((r) => r.pattern === '/blog/:slug')!;
      const blogData = await adapter.extractRoute(astroDir, blogRoute, contentsByPath.get(blogRoute.filePath)!);
      expect(blogData.title?.value).toBe('[Valeur dynamique]');
      expect(blogData.isDynamic).toBe(true);
    });
  });

  describe('NuxtAdapter', () => {
    it('detects Nuxt 3, discovers routes, and parses useSeoMeta and template components', async () => {
      const nuxtDir = cloneFixtureToTemp('tests/fixtures/nuxt-sample');
      const adapter = new NuxtAdapter();

      const files = [
        'nuxt.config.ts',
        'package.json',
        'layouts/default.vue',
        'pages/index.vue',
        'pages/produits/[id].vue',
        'pages/contact.vue',
      ];
      const contentsByPath = new Map<string, string>();
      for (const f of files) {
        contentsByPath.set(f, fs.readFileSync(path.join(nuxtDir, f), 'utf-8'));
      }

      const detected = await adapter.detect(nuxtDir, files, contentsByPath);
      expect(detected).toBe(true);

      const routes = await adapter.discoverRoutes(nuxtDir, files, contentsByPath, new Set());
      expect(routes.map((r) => r.pattern).sort()).toEqual(['/', '/contact', '/produits/:id']);

      // Extract index route (useSeoMeta)
      const indexRoute = routes.find((r) => r.pattern === '/')!;
      const indexData = await adapter.extractRoute(nuxtDir, indexRoute, contentsByPath.get(indexRoute.filePath)!);
      expect(indexData.title?.value).toBe('Accueil Nuxt 3');
      expect(indexData.description?.value).toBe('Boutique en ligne propulsée par Nuxt 3');
      expect(indexData.htmlLang?.value).toBe('fr'); // Inherited from layouts/default.vue
      expect(indexData.links.some((l) => l.toUrl === '/produits/42')).toBe(true);

      // Extract dynamic route
      const dynamicRoute = routes.find((r) => r.pattern === '/produits/:id')!;
      const dynamicData = await adapter.extractRoute(nuxtDir, dynamicRoute, contentsByPath.get(dynamicRoute.filePath)!);
      expect(dynamicData.title?.value).toBe('[Valeur dynamique]');
      expect(dynamicData.isDynamic).toBe(true);

      // Extract contact route (<Title> and <Meta>)
      const contactRoute = routes.find((r) => r.pattern === '/contact')!;
      const contactData = await adapter.extractRoute(nuxtDir, contactRoute, contentsByPath.get(contactRoute.filePath)!);
      expect(contactData.title?.value).toBe('Contactez-nous - Support Nuxt');
      expect(contactData.description?.value).toBe('Formulaire de contact et assistance en direct');
    });
  });

  describe('SvelteKitAdapter', () => {
    it('detects SvelteKit, discovers routes, and extracts <svelte:head> metadata', async () => {
      const svelteDir = cloneFixtureToTemp('tests/fixtures/sveltekit-sample');
      const adapter = new SvelteKitAdapter();

      const files = [
        'svelte.config.js',
        'package.json',
        'src/routes/+layout.svelte',
        'src/routes/+page.svelte',
        'src/routes/a-propos/+page.svelte',
        'src/routes/blog/[slug]/+page.svelte',
      ];
      const contentsByPath = new Map<string, string>();
      for (const f of files) {
        contentsByPath.set(f, fs.readFileSync(path.join(svelteDir, f), 'utf-8'));
      }

      const detected = await adapter.detect(svelteDir, files, contentsByPath);
      expect(detected).toBe(true);

      const routes = await adapter.discoverRoutes(svelteDir, files, contentsByPath, new Set());
      expect(routes.map((r) => r.pattern).sort()).toEqual(['/', '/a-propos', '/blog/:slug']);

      // Extract home route
      const homeRoute = routes.find((r) => r.pattern === '/')!;
      const homeData = await adapter.extractRoute(svelteDir, homeRoute, contentsByPath.get(homeRoute.filePath)!);
      expect(homeData.title?.value).toBe('Accueil SvelteKit');
      expect(homeData.description?.value).toBe('Application ultra-rapide développée avec SvelteKit');
      expect(homeData.htmlLang?.value).toBe('fr'); // Inherited from +layout.svelte

      // Extract dynamic route
      const blogRoute = routes.find((r) => r.pattern === '/blog/:slug')!;
      const blogData = await adapter.extractRoute(svelteDir, blogRoute, contentsByPath.get(blogRoute.filePath)!);
      expect(blogData.title?.value).toBe('[Valeur dynamique]');
      expect(blogData.isDynamic).toBe(true);
    });
  });

  describe('RemixAdapter', () => {
    it('detects Remix / React Router, discovers flat routes, and parses export const meta', async () => {
      const remixDir = cloneFixtureToTemp('tests/fixtures/remix-sample');
      const adapter = new RemixAdapter();

      const files = [
        'remix.config.js',
        'package.json',
        'app/root.tsx',
        'app/routes/_index.tsx',
        'app/routes/about.tsx',
        'app/routes/blog.$slug.tsx',
      ];
      const contentsByPath = new Map<string, string>();
      for (const f of files) {
        contentsByPath.set(f, fs.readFileSync(path.join(remixDir, f), 'utf-8'));
      }

      const detected = await adapter.detect(remixDir, files, contentsByPath);
      expect(detected).toBe(true);

      const routes = await adapter.discoverRoutes(remixDir, files, contentsByPath, new Set());
      expect(routes.map((r) => r.pattern).sort()).toEqual(['/', '/about', '/blog/:slug']);

      // Extract _index route
      const indexRoute = routes.find((r) => r.pattern === '/')!;
      const indexData = await adapter.extractRoute(remixDir, indexRoute, contentsByPath.get(indexRoute.filePath)!);
      expect(indexData.title?.value).toBe('Accueil Remix');
      expect(indexData.description?.value).toBe('Plateforme web moderne construite avec Remix');
      expect(indexData.htmlLang?.value).toBe('fr'); // Inherited from app/root.tsx

      // Extract dynamic route
      const blogRoute = routes.find((r) => r.pattern === '/blog/:slug')!;
      const blogData = await adapter.extractRoute(remixDir, blogRoute, contentsByPath.get(blogRoute.filePath)!);
      expect(blogData.title?.value).toBe('Article de Blog - Remix');
    });
  });
});

