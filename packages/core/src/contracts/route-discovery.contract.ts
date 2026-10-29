/**
 * Contract: Multi-Signal Route Discovery & Classifier
 * Distinguishes public acquisition pages from private application areas
 * using code inspection, auth tokens, and network/proxy configurations.
 */

import type { PageScope } from '../types/domain.js';

export interface RouteDiscoveryResult {
  routePath: string;
  sourceFilePath: string;
  scope: PageScope;
  authSignalsDetected: string[];
  proxyRulesApplied: string[];
  recommendedDirectives: {
    robots: 'index, follow' | 'noindex, nofollow';
    includeInSitemap: boolean;
  };
  confidenceScore: number; // 0.0 to 1.0
}

export interface IRouteDiscoveryService {
  /**
   * Scans the codebase, server configurations, and route definitions.
   * Returns classified routes with high-confidence public/private categorization.
   */
  discoverRoutes(projectRoot: string): Promise<RouteDiscoveryResult[]>;

  /**
   * Checks whether a specific file or route is strictly private.
   */
  isPrivateRoute(filePath: string): Promise<boolean>;
}

