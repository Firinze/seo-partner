export interface SitemapRouteEntry {
  pattern: string;
  isPrivate: boolean;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function buildSitemapXml(
  routes: ReadonlyArray<SitemapRouteEntry>,
  siteUrl: string,
): string {
  const cleanBase = siteUrl.replace(/\/+$/, '');
  const publicRoutes = routes.filter((r) => !r.isPrivate);

  const urlEntries = publicRoutes.map((r) => {
    const cleanPattern = r.pattern.startsWith('/') ? r.pattern : `/${r.pattern}`;
    const loc = `${cleanBase}${cleanPattern === '/' ? '' : cleanPattern}`;
    const lastmodTag = r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : '';
    const changefreqTag = r.changefreq ? `\n    <changefreq>${r.changefreq}</changefreq>` : '';
    const priorityTag = typeof r.priority === 'number' ? `\n    <priority>${r.priority.toFixed(1)}</priority>` : '';

    return `  <url>\n    <loc>${loc}</loc>${lastmodTag}${changefreqTag}${priorityTag}\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlEntries,
    '</urlset>',
  ].join('\n');
}

export function buildNextJsAppSitemap(
  routes: ReadonlyArray<SitemapRouteEntry>,
  siteUrl: string,
): string {
  const cleanBase = siteUrl.replace(/\/+$/, '');
  const publicRoutes = routes.filter((r) => !r.isPrivate);

  const items = publicRoutes.map((r) => {
    const cleanPattern = r.pattern.startsWith('/') ? r.pattern : `/${r.pattern}`;
    const loc = `${cleanBase}${cleanPattern === '/' ? '' : cleanPattern}`;
    return `    {\n      url: '${loc}',\n      lastModified: new Date(),\n      changeFrequency: 'weekly',\n      priority: ${cleanPattern === '/' ? '1.0' : '0.8'},\n    },`;
  });

  return [
    "import type { MetadataRoute } from 'next';",
    '',
    'export default function sitemap(): MetadataRoute.Sitemap {',
    '  return [',
    ...items,
    '  ];',
    '}',
  ].join('\n');
}

