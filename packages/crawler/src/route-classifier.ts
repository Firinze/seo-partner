import type { PageScope } from '@seo-partner/core';
import { detectAuthSignalsInContent } from './auth-signals.js';
import type { RouteRuleHint } from './proxy-rules.js';

export interface RouteClassification {
  routePath: string;
  sourceFilePath: string;
  scope: PageScope;
  authSignals: string[];
  recommendedRobots: 'index, follow' | 'noindex, nofollow';
  includeInSitemap: boolean;
  confidenceScore: number;
}

export function classifyRoute(
  sourceFilePath: string,
  fileContent: string,
  routePath: string,
  proxyHints: RouteRuleHint[] = [],
): RouteClassification {
  const authSignals = detectAuthSignalsInContent(fileContent);

  // Check matching proxy hints
  const matchedProxyHint = proxyHints.find((h) => {
    if (h.pattern === '/*') return true;
    const cleanPattern = h.pattern.replace(/\/\*$/, '');
    return routePath.startsWith(cleanPattern);
  });

  const isPrivate = authSignals.length > 0 || Boolean(matchedProxyHint?.isPrivate);

  return {
    routePath,
    sourceFilePath,
    scope: isPrivate ? 'private' : 'public',
    authSignals: matchedProxyHint ? [...authSignals, matchedProxyHint.reason] : authSignals,
    recommendedRobots: isPrivate ? 'noindex, nofollow' : 'index, follow',
    includeInSitemap: !isPrivate,
    confidenceScore: isPrivate ? 0.98 : 0.95,
  };
}

