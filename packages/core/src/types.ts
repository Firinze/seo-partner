export type SupportedLanguage = 'en' | 'fr';
export type IdeTarget = 'agy' | 'claude' | 'cursor' | 'gemini' | 'codex';
export type RouterKind =
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'static-html'
  | 'markdown'
  | 'laravel'
  | 'symfony'
  | 'php';
export type RenderingMode = 'ssr-ssg' | 'client-only' | 'dynamic' | 'static';
export type FileKind = 'route' | 'layout' | 'robots' | 'sitemap' | 'config' | 'static' | 'other';
export type RuleCategory = 'technical' | 'on-page' | 'schema' | 'local' | 'geo';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type FindingStatus = 'open' | 'acknowledged' | 'resolved';
export type OwnerRole = 'dev' | 'content' | 'outreach';
export type TargetTimeframe = 'immediate' | '30-days' | '90-days';
export type ReportType = 'audit-complet' | 'audit-technique' | 'backlog';
export type ReportFormat = 'md' | 'json' | 'html';
export type CrawlRunStatus = 'running' | 'completed' | 'interrupted' | 'failed';

export interface CliEnvelope<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
}

export interface SeoConfig {
  readonly version: '1.0';
  readonly projectName: string;
  readonly lang: SupportedLanguage;
  readonly ideTargets: ReadonlyArray<IdeTarget>;
  readonly maxFileSizeKb: number;
  readonly excludePatterns: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectRecord {
  readonly id: string;
  readonly rootPath: string;
  readonly name: string;
  readonly frameworks: ReadonlyArray<string>;
  readonly hasRobotsTxt: boolean;
  readonly hasSitemap: boolean;
  readonly createdAt: string;
  readonly lastScannedAt: string | null;
}

export interface ScannedFile {
  readonly id?: number;
  readonly projectId: string;
  readonly path: string;
  readonly hash: string;
  readonly mtimeMs: number;
  readonly sizeBytes: number;
  readonly kind: FileKind;
  readonly scannedAt: string;
}

export interface DiscoveredRoute {
  readonly id?: number;
  readonly pattern: string;
  readonly filePath: string;
  readonly routerKind: RouterKind;
  readonly renderingMode: RenderingMode;
  readonly isPrivate: boolean;
  readonly inSitemap: boolean;
}

export interface HeadingItem {
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly text: string;
  readonly line: number;
}

export interface ImageItem {
  readonly src: string;
  readonly alt: string | null;
  readonly hasAlt: boolean;
  readonly width: string | number | null;
  readonly height: string | number | null;
  readonly line: number;
}

export interface LinkItem {
  readonly toUrl: string;
  readonly anchorText: string;
  readonly kind: 'internal' | 'external';
  readonly rel: string | null;
  readonly line: number;
}

export interface JsonLdItem {
  readonly schemaType: string | null;
  readonly rawJson: string;
  readonly isValid: boolean;
  readonly validationError: string | null;
  readonly line: number;
}

export interface ExtractedRouteData {
  readonly route: DiscoveredRoute;
  readonly title: { readonly value: string; readonly line: number } | null;
  readonly description: { readonly value: string; readonly line: number } | null;
  readonly canonical: { readonly value: string; readonly line: number } | null;
  readonly robots: { readonly value: string; readonly line: number } | null;
  readonly htmlLang?: { readonly value: string; readonly line: number } | null;
  readonly headings: ReadonlyArray<HeadingItem>;
  readonly openGraph: Record<string, string>;
  readonly hreflang: ReadonlyArray<{ readonly lang: string; readonly url: string }>;
  readonly images: ReadonlyArray<ImageItem>;
  readonly links: ReadonlyArray<LinkItem>;
  readonly jsonLdItems: ReadonlyArray<JsonLdItem>;
}

export interface IncrementalScanStats {
  readonly incremental: boolean;
  readonly filesScanned: number;
  readonly filesParsed: number;
  readonly filesReused: number;
  readonly filesPurged: number;
}

export interface FtsSearchResult {
  readonly routeId: number;
  readonly routePattern: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly headingsText: string | null;
  readonly rank: number;
}

export interface CrawlConfig {
  readonly maxPages: number;
  readonly maxDepth: number;
  readonly concurrency: number;
  readonly rateLimitMs: number;
  readonly maxRedirects: number;
  readonly allowLocal: boolean;
  readonly js: boolean;
  readonly userAgent: string;
}

export interface CrawlRedirectHop {
  readonly from: string;
  readonly to: string;
  readonly status: number;
}

export interface CrawlRun {
  readonly id: string;
  readonly projectId: string;
  readonly startUrl: string;
  readonly config: CrawlConfig;
  readonly status: CrawlRunStatus;
  readonly pagesCrawled: number;
  readonly errorsCount: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
}

export interface CrawlPage {
  readonly id?: number;
  readonly crawlRunId: string;
  readonly url: string;
  readonly routePattern: string;
  readonly statusCode: number;
  readonly redirectChain: ReadonlyArray<CrawlRedirectHop>;
  readonly responseTimeMs: number;
  readonly depth: number;
  readonly xRobotsTag: string | null;
  readonly httpCanonical: string | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly canonical: string | null;
  readonly robotsMeta: string | null;
  readonly h1: string | null;
  readonly htmlLang: string | null;
  readonly openGraph: Record<string, string>;
  readonly hreflang: ReadonlyArray<{ readonly lang: string; readonly url: string }>;
  readonly internalLinks: ReadonlyArray<string>;
  readonly brokenLinks: ReadonlyArray<string>;
  readonly untrustedExternal: boolean;
  readonly crawledAt: string;
}

export interface IceBreakdown {
  readonly impact: number;
  readonly confidence: number;
  readonly effort: number;
  readonly score: number;
  readonly rationale: {
    readonly en: string;
    readonly fr: string;
  };
}

export interface FindingEvidence {
  readonly source: 'code-scan' | 'http-crawl' | 'code-vs-crawl';
  readonly filePath: string;
  readonly lineNumber: number;
  readonly url?: string;
  readonly statusCode?: number;
  readonly observed: string;
  readonly expected: string;
}

export interface RuleDefinition {
  readonly id: string;
  readonly category: RuleCategory;
  readonly defaultSeverity: SeverityLevel;
  readonly blocksIndexing: boolean;
  readonly officialSourceUrl: string;
  readonly title: {
    readonly en: string;
    readonly fr: string;
  };
  readonly defaultIce: {
    readonly impact: number;
    readonly confidence: number;
    readonly effort: number;
    readonly rationale: {
      readonly en: string;
      readonly fr: string;
    };
  };
  readonly ownerRole: OwnerRole;
  readonly targetTimeframe: TargetTimeframe;
  readonly kpi: {
    readonly en: string;
    readonly fr: string;
  };
}

export interface Finding {
  readonly id: string;
  readonly ruleId: string;
  readonly category: RuleCategory;
  readonly severity: SeverityLevel;
  readonly blocksIndexing: boolean;
  readonly subjectRef: string;
  readonly evidence: FindingEvidence;
  readonly ice: IceBreakdown;
  readonly remediation: {
    readonly en: string;
    readonly fr: string;
  };
  readonly ownerRole: OwnerRole;
  readonly targetTimeframe: TargetTimeframe;
  readonly kpi: {
    readonly en: string;
    readonly fr: string;
  };
  readonly officialSourceUrl: string;
  readonly status: FindingStatus;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly resolvedAt: string | null;
}

export interface PrioritizedAction {
  readonly id: string;
  readonly findingId: string;
  readonly ruleId: string;
  readonly subjectRef: string;
  readonly severity: SeverityLevel;
  readonly blocksIndexing: boolean;
  readonly ice: IceBreakdown;
  readonly remediation: {
    readonly en: string;
    readonly fr: string;
  };
  readonly ownerRole: OwnerRole;
  readonly targetTimeframe: TargetTimeframe;
  readonly kpi: {
    readonly en: string;
    readonly fr: string;
  };
  readonly status: 'todo' | 'in_progress' | 'done';
  readonly evidence: FindingEvidence;
}

export interface DecisionRecord {
  readonly id?: number;
  readonly date: string;
  readonly title: string;
  readonly rationale: string;
  readonly findingId: string | null;
}

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
}

export interface ApiErrorData {
  readonly problem: ProblemDetails;
}

export interface ApiResponseEnvelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error: string | null;
}

export interface DashboardOverview {
  readonly project: ProjectRecord | null;
  readonly stats: {
    readonly filesScanned: number;
    readonly routesCount: number;
    readonly totalFindings: number;
    readonly blockingIndexingCount: number;
    readonly bySeverity: Record<SeverityLevel, number>;
    readonly byCategory: Record<RuleCategory, number>;
    readonly decisionsCount: number;
  };
  readonly latestCrawlRun: CrawlRun | null;
}

export interface CodeVsCrawlDivergence {
  readonly field: 'canonical' | 'title' | 'h1' | 'robots' | 'htmlLang' | 'status';
  readonly codeValue: string | null;
  readonly crawlValue: string | null;
  readonly severity: SeverityLevel;
}

export interface CodeVsCrawlComparisonRow {
  readonly routePattern: string;
  readonly filePath: string | null;
  readonly crawledUrl: string | null;
  readonly statusCode: number | null;
  readonly responseTimeMs: number | null;
  readonly redirectHops: number;
  readonly code: {
    readonly title: string | null;
    readonly description: string | null;
    readonly canonical: string | null;
    readonly robots: string | null;
    readonly h1: string | null;
    readonly htmlLang: string | null;
  } | null;
  readonly crawl: {
    readonly title: string | null;
    readonly description: string | null;
    readonly canonical: string | null;
    readonly xRobotsTag: string | null;
    readonly robotsMeta: string | null;
    readonly h1: string | null;
    readonly htmlLang: string | null;
    readonly brokenLinksCount: number;
  } | null;
  readonly divergences: ReadonlyArray<CodeVsCrawlDivergence>;
}

export interface ServeCommandResult {
  readonly projectId: string | null;
  readonly host: '127.0.0.1';
  readonly requestedPort: number;
  readonly port: number;
  readonly fallbackUsed: boolean;
  readonly url: string;
  readonly openApiUrl: string;
  readonly lang?: SupportedLanguage;
}

// ============================================================================
// v0.4 Shared Tools, MCP and Deterministic Patch Types
// ============================================================================

export type ToolName =
  | 'scan'
  | 'audit'
  | 'backlog'
  | 'search_fts'
  | 'compare_code_crawl'
  | 'record_decision'
  | 'propose_patch';

export interface ToolContext {
  readonly projectRoot: string;
  readonly allowApply: boolean;
  readonly lang: SupportedLanguage;
}

export interface ToolResult {
  readonly ok: boolean;
  readonly data: unknown;
  readonly summary: string;
  readonly initialScanPerformed: boolean;
}

export interface PatchHunk {
  readonly oldStart: number;
  readonly oldLines: number;
  readonly newStart: number;
  readonly newLines: number;
  readonly lines: ReadonlyArray<string>;
}

export interface PatchProposal {
  readonly id: string;
  readonly findingId: string;
  readonly ruleId: string;
  readonly filePath: string;
  readonly kind: 'modify' | 'create';
  readonly hunks: ReadonlyArray<PatchHunk>;
  readonly diff: string;
  readonly manualReviewRequired: boolean;
  readonly todoMarkers: number;
}

export type PatchSkippedReason =
  | 'unsupported-rule'
  | 'context-not-found'
  | 'unsafe-path'
  | 'file-too-large'
  | 'framework-metadata';

export interface PatchSkipped {
  readonly findingId: string;
  readonly ruleId: string;
  readonly reason: PatchSkippedReason;
  readonly message: string;
}

export interface PatchBatchResult {
  readonly batchId: string;
  readonly createdAt: string;
  readonly diffPath: string;
  readonly filesCovered: number;
  readonly proposals: ReadonlyArray<PatchProposal>;
  readonly skipped: ReadonlyArray<PatchSkipped>;
  readonly applied: boolean;
  readonly appliedAt: string | null;
  readonly backupDir: string | null;
  readonly todoMarkersRemaining: number;
  readonly initialScanPerformed: boolean;
}

export type ApplyRefusalCode =
  | 'git-dirty'
  | 'context-mismatch'
  | 'unsafe-path'
  | 'apply-not-allowed';

export interface ApplyRefusal {
  readonly code: ApplyRefusalCode;
  readonly files: ReadonlyArray<string>;
  readonly message: string;
}

export interface McpConfigSnippet {
  readonly ide: IdeTarget;
  readonly relativePath: string;
  readonly format: 'json' | 'toml';
  readonly content: string;
  readonly written: boolean;
  readonly warning: string | null;
}

export interface InitCommandResult {
  readonly projectRoot: string;
  readonly ideTargets: ReadonlyArray<IdeTarget>;
  readonly lang: SupportedLanguage;
  readonly createdFiles: ReadonlyArray<string>;
  readonly gitignoreUpdated: boolean;
  readonly gitignoreAddedEntries: ReadonlyArray<string>;
  readonly dryRun: boolean;
  readonly mcpSnippets?: ReadonlyArray<McpConfigSnippet>;
}



