import type { FrameworkAdapter } from './contract.js';
import { NextJsAdapter } from './nextjs-adapter.js';
import { AstroAdapter } from './astro-adapter.js';
import { NuxtAdapter } from './nuxt-adapter.js';
import { SvelteKitAdapter } from './sveltekit-adapter.js';
import { RemixAdapter } from './remix-adapter.js';
import { PhpAdapter } from './php-adapter.js';
import { DjangoAdapter } from './django-adapter.js';
import { StaticAdapter } from './static-adapter.js';

/**
 * Detection order contract (strictly prioritized to avoid ambiguities):
 * 1. Next.js
 * 2. Astro
 * 3. Nuxt 3
 * 4. SvelteKit
 * 5. Remix / React Router v7
 * 6. PHP (Laravel / Symfony / Native)
 * 7. Django (Python)
 * 8. Static HTML
 */
export const BUILTIN_ADAPTERS: ReadonlyArray<FrameworkAdapter> = [
  new NextJsAdapter(),
  new AstroAdapter(),
  new NuxtAdapter(),
  new SvelteKitAdapter(),
  new RemixAdapter(),
  new PhpAdapter(),
  new DjangoAdapter(),
  new StaticAdapter(),
];

export async function detectActiveAdapters(
  projectRoot: string,
  filePaths: ReadonlyArray<string>,
  contentsByPath: ReadonlyMap<string, string>,
): Promise<ReadonlyArray<FrameworkAdapter>> {
  const active: FrameworkAdapter[] = [];
  for (const adapter of BUILTIN_ADAPTERS) {
    const matched = await adapter.detect(projectRoot, filePaths, contentsByPath);
    if (matched) {
      active.push(adapter);
    }
  }
  return active;
}
