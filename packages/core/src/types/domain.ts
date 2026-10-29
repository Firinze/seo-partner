/**
 * Domain Models for Intelligent Multi-Framework SEO
 * Defined in specs/010-refonte-intelligence-ia/data-model.md
 */

export type FrameworkType =
  | 'next_app'
  | 'next_pages'
  | 'nuxt'
  | 'astro'
  | 'sveltekit'
  | 'laravel'
  | 'symfony'
  | 'django'
  | 'php_native'
  | 'unknown';

export type LanguageType = 'typescript' | 'javascript' | 'php' | 'python';

export type AiChannelType = 'mcp_ide' | 'external_api' | 'opencode_local' | 'none';

export interface AiProviderState {
  activeChannel: AiChannelType;
  modelName: string;
  isAvailable: boolean;
  lastHealthCheck: string;
}

export interface SeoProjectContext {
  id: string;
  projectRoot: string;
  framework: FrameworkType;
  language: LanguageType;
  packageVersion?: string | null;
  aiProvider: AiProviderState;
  hasGitIgnoreGuard: boolean;
  lastScannedAt: string;
}

export type PageScope = 'public' | 'private';
export type SkeletonType = 'none' | 'partial_object' | 'full_object' | 'static_file';

export interface PageInventoryItem {
  id: string;
  sourceFilePath: string;
  routePath: string;
  scope: PageScope;
  authSignals: string[];
  existingMetadata?: {
    title?: string | null;
    description?: string | null;
    canonical?: string | null;
    robots?: string | null;
    openGraph?: Record<string, unknown> | null;
  } | null;
  existingSkeleton: SkeletonType;
  recommendedRobots: string;
  inSitemap: boolean;
}

export type PatchOperationType = 'enrich_in_place' | 'create_native' | 'remove_obsolete';
export type PatchProposalStatus = 'pending' | 'accepted' | 'rejected' | 'applied';

export interface AstPatchProposal {
  id: string;
  targetFilePath: string;
  operationType: PatchOperationType;
  astNodeType: string;
  status: PatchProposalStatus;
  diffOriginal: string;
  diffProposed: string;
  idePrompt: string;
  createdAt: string;
  appliedAt?: string | null;
}

export interface ConnectorCredential {
  service: 'google_search_console' | 'bing_webmaster' | 'indexnow';
  authType: 'oauth_token' | 'service_account' | 'api_key';
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  serviceAccountEmail?: string | null;
  siteUrl: string;
  lastSyncedAt?: string | null;
}

export interface SatelliteBrief {
  slug: string;
  title: string;
  targetKeyword: string;
  searchIntent: string;
  summary: string;
  wordCountTarget: number;
}

export interface EditorialTopicCluster {
  id: string;
  coreTheme: string;
  pillarPageUrl: string;
  satelliteTopics: SatelliteBrief[];
  internalLinkingPlan: {
    source: string;
    target: string;
    anchorText: string;
  }[];
}

export interface EliteDeliverable {
  id: string;
  title: string;
  outputPath: string;
  status: 'draft' | 'published' | 'outdated';
  content: string;
}

