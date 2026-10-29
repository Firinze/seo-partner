import { describe, it, expect } from 'vitest';
import { patchNuxtTemplate } from '../../../packages/adapters/src/nuxt-adapter.js';
import { patchAstroTemplate } from '../../../packages/adapters/src/astro-adapter.js';
import { patchSvelteKitTemplate } from '../../../packages/adapters/src/sveltekit-adapter.js';

describe('Modern Framework Adapters (Nuxt 3, Astro, SvelteKit)', () => {
  it('enriches Nuxt 3 SFC with useSeoMeta() in <script setup>', () => {
    const vueSfc = `<template>\n  <div><h1>Page Nuxt</h1></div>\n</template>\n`;
    const patched = patchNuxtTemplate(vueSfc, {
      title: 'Titre Nuxt 3',
      description: 'Description Nuxt 3 optimisée.',
    });

    expect(patched).toContain("<script setup lang=\"ts\">");
    expect(patched).toContain("useSeoMeta({");
    expect(patched).toContain("title: 'Titre Nuxt 3'");
    expect(patched).toContain("description: 'Description Nuxt 3 optimisée.'");
  });

  it('enriches Astro frontmatter with metadata variables and SEO component', () => {
    const astroFile = `---
const pageTitle = "Page Initiale";
---
<html>
  <body>
    <h1>Titre</h1>
  </body>
</html>`;

    const patched = patchAstroTemplate(astroFile, {
      title: 'Titre Astro Optimisé',
      description: 'Description Astro pour le référencement.',
      canonical: 'https://example.com/astro',
    });

    expect(patched).toContain('title: "Titre Astro Optimisé"');
    expect(patched).toContain('description: "Description Astro pour le référencement."');
  });

  it('enriches SvelteKit template with <svelte:head>', () => {
    const svelteFile = `<h1>Page SvelteKit</h1>\n<p>Contenu principal.</p>\n`;
    const patched = patchSvelteKitTemplate(svelteFile, {
      title: 'Titre SvelteKit',
      description: 'Description SvelteKit performante.',
    });

    expect(patched).toContain('<svelte:head>');
    expect(patched).toContain('<title>Titre SvelteKit</title>');
    expect(patched).toContain('<meta name="description" content="Description SvelteKit performante." />');
    expect(patched).toContain('</svelte:head>');
  });
});

