import type { RouterKind } from '@seo-partner/core';

/**
 * Normalizes framework-specific route file names and path declarations
 * into a unified standard route pattern:
 * - Dynamic parameter: `:param`
 * - Catch-all parameter: `*rest`
 * - Root path: `/`
 * - Slashes: single leading slash, no trailing slash (unless root `/`)
 */
export function normalizeRoutePattern(rawPath: string, routerKind?: RouterKind): string {
  let cleaned = rawPath.replace(/\\/g, '/').trim();

  // Strip leading folder roots if passed as full file paths
  cleaned = cleaned.replace(/^(?:src\/)?(?:pages|routes|app\/routes)\//i, '');

  // Strip file extensions if present (.astro, .vue, .svelte, .tsx, .jsx, .md, .mdx, .html, .php)
  cleaned = cleaned.replace(/\.(astro|vue|svelte|tsx|jsx|ts|js|md|mdx|html|php)$/i, '');

  // Strip route file conventions (e.g. Next.js page, SvelteKit +page, Remix route, index)
  cleaned = cleaned.replace(/(?:^|\/)(?:page|\+page|route|index|_index)$/i, '');

  if (routerKind === 'remix') {
    // Remix flat route conventions:
    // "blog.$slug" -> "blog/:slug"
    // "docs.$" -> "docs/*"
    // "$slug" -> ":slug"
    // "$" -> "*"
    cleaned = cleaned.replace(/\.\$([a-zA-Z0-9_]+)/g, '/:$1');
    cleaned = cleaned.replace(/\.\$/g, '/*');
    cleaned = cleaned.replace(/^\$([a-zA-Z0-9_]+)/g, ':$1');
    cleaned = cleaned.replace(/^\$$/g, '*');
    cleaned = cleaned.replace(/\./g, '/');
  }

  if (routerKind === 'django') {
    // Django re_path named groups: (?P<slug>[-\w]+) -> :slug (run before <param> replacement)
    cleaned = cleaned.replace(/\(\?P<([a-zA-Z0-9_]+)>[^)]+\)/g, ':$1');
    // Django path converters: <int:id>, <slug:slug>, <str:username>, <uuid:pk>, <path:subpath>
    cleaned = cleaned.replace(/<path:([a-zA-Z0-9_]+)>/g, '*$1');
    cleaned = cleaned.replace(/<[a-zA-Z0-9_]+:([a-zA-Z0-9_]+)>/g, ':$1');
    cleaned = cleaned.replace(/<([a-zA-Z0-9_]+)>/g, ':$1');
    // Strip regex markers ^ and $
    cleaned = cleaned.replace(/^\^/, '').replace(/\$$/, '');
  }

  // Next.js, Astro, Nuxt, SvelteKit brackets:
  // Catch-all: [[...rest]] or [...rest] -> *rest
  cleaned = cleaned.replace(/\[\[\.\.\.([a-zA-Z0-9_]+)\]\]/g, '*$1');
  cleaned = cleaned.replace(/\[\.\.\.([a-zA-Z0-9_]+)\]/g, '*$1');
  // Single dynamic: [param] -> :param
  cleaned = cleaned.replace(/\[([a-zA-Z0-9_]+)\]/g, ':$1');

  // Nuxt 3 catch-all with triple dots or just [...slug]
  cleaned = cleaned.replace(/\[\.\.\.\]/g, '*');

  // Remove parenthesis group folders: e.g. Next.js / Astro (marketing) -> ignored
  cleaned = cleaned.replace(/\([a-zA-Z0-9_-]+\)\/?/g, '');

  // Normalize slashes
  cleaned = cleaned.replace(/\/+/g, '/');
  if (!cleaned.startsWith('/')) {
    cleaned = `/${cleaned}`;
  }
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned || '/';
}
