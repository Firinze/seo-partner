import fs from 'node:fs';
import path from 'node:path';

export interface SeoFileInventory {
  robots: {
    appRobotsTs?: string;
    publicRobotsTxt?: string;
    hasConflict: boolean;
  };
  sitemap: {
    appSitemapTs?: string;
    publicSitemapXml?: string;
    hasConflict: boolean;
  };
}

export function detectSeoFileInventory(projectRoot: string): SeoFileInventory {
  const checkExists = (rel: string) => {
    const full = path.join(projectRoot, rel);
    return fs.existsSync(full) ? rel : undefined;
  };

  const appRobotsTs =
    checkExists('app/robots.ts') ||
    checkExists('app/robots.js') ||
    checkExists('src/app/robots.ts') ||
    checkExists('src/app/robots.js');

  const publicRobotsTxt =
    checkExists('public/robots.txt') ||
    checkExists('robots.txt');

  const appSitemapTs =
    checkExists('app/sitemap.ts') ||
    checkExists('app/sitemap.js') ||
    checkExists('src/app/sitemap.ts') ||
    checkExists('src/app/sitemap.js');

  const publicSitemapXml =
    checkExists('public/sitemap.xml') ||
    checkExists('sitemap.xml');

  return {
    robots: {
      appRobotsTs,
      publicRobotsTxt,
      hasConflict: Boolean(appRobotsTs && publicRobotsTxt),
    },
    sitemap: {
      appSitemapTs,
      publicSitemapXml,
      hasConflict: Boolean(appSitemapTs && publicSitemapXml),
    },
  };
}

