import fs from 'node:fs';
import path from 'node:path';

export interface RouteRuleHint {
  pattern: string;
  isPrivate: boolean;
  reason: string;
}

export function parseProxyAndRouteRules(projectRoot: string): RouteRuleHint[] {
  const hints: RouteRuleHint[] = [];

  // 1. Check Apache .htaccess
  const htaccessPath = path.join(projectRoot, '.htaccess');
  if (fs.existsSync(htaccessPath)) {
    const content = fs.readFileSync(htaccessPath, 'utf-8');
    if (/AuthType\s+Basic/i.test(content) || /Require\s+valid-user/i.test(content)) {
      hints.push({ pattern: '/*', isPrivate: true, reason: 'htaccess-auth-basic' });
    }
  }

  // 2. Check Nginx configuration
  const nginxCandidates = [
    path.join(projectRoot, 'nginx.conf'),
    path.join(projectRoot, 'docker', 'nginx.conf'),
  ];
  for (const candidate of nginxCandidates) {
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, 'utf-8');
      const locationBlocks = content.match(/location\s+([^{]+)\{[^}]+auth_basic[^}]+}/gi);
      if (locationBlocks) {
        for (const block of locationBlocks) {
          const match = block.match(/location\s+([^\s{]+)/i);
          if (match && match[1]) {
            hints.push({ pattern: match[1], isPrivate: true, reason: 'nginx-auth-basic' });
          }
        }
      }
    }
  }

  // 3. Check Next.js Route Rewrites / Redirects
  const nextConfigCandidates = [
    path.join(projectRoot, 'next.config.js'),
    path.join(projectRoot, 'next.config.mjs'),
    path.join(projectRoot, 'next.config.ts'),
  ];
  for (const candidate of nextConfigCandidates) {
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, 'utf-8');
      if (content.includes('redirects') && content.includes('/login')) {
        hints.push({ pattern: '/(admin|dashboard|account)/*', isPrivate: true, reason: 'next-config-redirect-login' });
      }
    }
  }

  // 4. Check Laravel routes/web.php
  const laravelRoutesPath = path.join(projectRoot, 'routes', 'web.php');
  if (fs.existsSync(laravelRoutesPath)) {
    const content = fs.readFileSync(laravelRoutesPath, 'utf-8');
    const groupMatches = content.match(/Route::middleware\s*\(\s*\[?[^\]]*['"`]auth['"`][^)]*\)\s*->group/gi);
    if (groupMatches) {
      hints.push({ pattern: '/auth-group/*', isPrivate: true, reason: 'laravel-auth-route-group' });
    }
  }

  return hints;
}

