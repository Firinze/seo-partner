export type SupportedLanguage = 'en' | 'fr';
export type IdeTarget = 'agy' | 'claude' | 'cursor' | 'gemini' | 'codex';
export type RouterKind = 'nextjs-app' | 'nextjs-pages' | 'static-html' | 'markdown';
export type RenderingMode = 'ssr-ssg' | 'client-only' | 'dynamic' | 'static';
export type FileKind = 'route' | 'layout' | 'robots' | 'sitemap' | 'config' | 'static' | 'other';
export type RuleCategory = 'technical' | 'on-page' | 'schema' | 'local' | 'geo';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type FindingStatus = 'open' | 'acknowledged' | 'resolved';
export type OwnerRole = 'dev' | 'content' | 'outreach';
export type TargetTimeframe = 'immediate' | '30-days' | '90-days';
export type ReportType = 'audit-complet' | 'audit-technique' | 'backlog';

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
  readonly headings: ReadonlyArray<HeadingItem>;
  readonly openGraph: Record<string, string>;
  readonly hreflang: ReadonlyArray<{ readonly lang: string; readonly url: string }>;
  readonly images: ReadonlyArray<ImageItem>;
  readonly links: ReadonlyArray<LinkItem>;
  readonly jsonLdItems: ReadonlyArray<JsonLdItem>;
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
  readonly source: 'code-scan';
  readonly filePath: string;
  readonly lineNumber: number;
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

