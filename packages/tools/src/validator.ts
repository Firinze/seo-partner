import type {
  OwnerRole,
  ReportFormat,
  ReportType,
  RuleCategory,
  SeverityLevel,
  SupportedLanguage,
  TargetTimeframe,
} from '@seo-partner/core';

export interface SafeParseSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface SafeParseError {
  readonly success: false;
  readonly error: string;
}

export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError;

export interface SchemaValidator<T> {
  readonly safeParse: (input: unknown) => SafeParseResult<T>;
  readonly parse: (input: unknown) => T;
}

function makeValidator<T>(
  validateFn: (input: unknown) => SafeParseResult<T>,
): SchemaValidator<T> {
  return {
    safeParse: validateFn,
    parse(input: unknown): T {
      const res = validateFn(input);
      if (!res.success) {
        throw new Error(res.error);
      }
      return res.data;
    },
  };
}

export const z = {
  string(options?: { minLength?: number; url?: boolean }): SchemaValidator<string> {
    return makeValidator<string>((input) => {
      if (typeof input !== 'string') {
        return { success: false, error: 'Expected a string' };
      }
      const trimmed = input.trim();
      if (options?.minLength !== undefined && trimmed.length < options.minLength) {
        return {
          success: false,
          error: `String must contain at least ${options.minLength} character(s)`,
        };
      }
      if (options?.url) {
        try {
          const parsed = new URL(trimmed);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { success: false, error: 'URL must use http:// or https:// protocol' };
          }
        } catch {
          return { success: false, error: 'Invalid URL format' };
        }
      }
      return { success: true, data: trimmed };
    });
  },

  number(options?: { min?: number; max?: number; int?: boolean }): SchemaValidator<number> {
    return makeValidator<number>((input) => {
      const num =
        typeof input === 'number'
          ? input
          : typeof input === 'string' && input.trim() !== ''
            ? Number(input)
            : Number.NaN;
      if (!Number.isFinite(num)) {
        return { success: false, error: 'Expected a valid number' };
      }
      if (options?.int && !Number.isInteger(num)) {
        return { success: false, error: 'Expected an integer' };
      }
      if (options?.min !== undefined && num < options.min) {
        return { success: false, error: `Number must be >= ${options.min}` };
      }
      if (options?.max !== undefined && num > options.max) {
        return { success: false, error: `Number must be <= ${options.max}` };
      }
      return { success: true, data: num };
    });
  },

  boolean(): SchemaValidator<boolean> {
    return makeValidator<boolean>((input) => {
      if (typeof input === 'boolean') return { success: true, data: input };
      if (input === 'true') return { success: true, data: true };
      if (input === 'false') return { success: true, data: false };
      return { success: false, error: 'Expected a boolean (true or false)' };
    });
  },

  enum<T extends string>(allowed: ReadonlyArray<T>): SchemaValidator<T> {
    return makeValidator<T>((input) => {
      if (typeof input === 'string' && (allowed as ReadonlyArray<string>).includes(input)) {
        return { success: true, data: input as T };
      }
      return {
        success: false,
        error: `Expected one of: ${allowed.join(', ')}`,
      };
    });
  },

  optional<T>(inner: SchemaValidator<T>): SchemaValidator<T | undefined> {
    return makeValidator<T | undefined>((input) => {
      if (input === undefined || input === null || input === '') {
        return { success: true, data: undefined };
      }
      return inner.safeParse(input);
    });
  },

  object<Shape extends Record<string, SchemaValidator<unknown>>>(
    shape: Shape,
  ): SchemaValidator<{
    [K in keyof Shape]: Shape[K] extends SchemaValidator<infer V> ? V : never;
  }> {
    type Output = {
      [K in keyof Shape]: Shape[K] extends SchemaValidator<infer V> ? V : never;
    };
    return makeValidator<Output>((input) => {
      if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        return { success: false, error: 'Expected a JSON object' };
      }
      const record = input as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [key, fieldValidator] of Object.entries(shape)) {
        const res = fieldValidator.safeParse(record[key]);
        if (!res.success) {
          return {
            success: false,
            error: `Field '${key}': ${res.error}`,
          };
        }
        out[key] = res.data;
      }
      return { success: true, data: out as Output };
    });
  },
};

export const VALID_RULE_CATEGORIES: ReadonlyArray<RuleCategory> = [
  'technical',
  'on-page',
  'schema',
  'local',
  'geo',
];

export const VALID_SEVERITIES: ReadonlyArray<SeverityLevel> = [
  'critical',
  'high',
  'medium',
  'low',
];

export const VALID_OWNER_ROLES: ReadonlyArray<OwnerRole> = ['dev', 'content', 'outreach'];

export const VALID_TIMEFRAMES: ReadonlyArray<TargetTimeframe> = [
  'immediate',
  '30-days',
  '90-days',
];

export const VALID_REPORT_FORMATS: ReadonlyArray<ReportFormat> = ['html', 'md', 'json'];

export const VALID_REPORT_TYPES: ReadonlyArray<ReportType> = [
  'audit-complet',
  'audit-technique',
  'backlog',
];

export const VALID_LANGUAGES_LIST: ReadonlyArray<SupportedLanguage> = ['en', 'fr'];

export const CORRIGEABLE_RULE_IDS = [
  'R-TECH-01',
  'R-TECH-02',
  'R-TECH-03',
  'R-TECH-05',
  'R-TECH-14',
  'R-ONPAGE-01',
  'R-ONPAGE-04',
] as const;

export type CorrigeableRuleId = typeof CORRIGEABLE_RULE_IDS[number];

export const SearchQuerySchema = z.object({
  q: z.string({ minLength: 1 }),
  limit: z.optional(z.number({ min: 1, max: 100, int: true })),
});

export const FindingsQuerySchema = z.object({
  category: z.optional(z.enum(VALID_RULE_CATEGORIES)),
  severity: z.optional(z.enum(VALID_SEVERITIES)),
  blocksIndexing: z.optional(z.boolean()),
  ruleId: z.optional(z.string({ minLength: 1 })),
  routePattern: z.optional(z.string({ minLength: 1 })),
});

export const BacklogQuerySchema = z.object({
  ownerRole: z.optional(z.enum(VALID_OWNER_ROLES)),
  targetTimeframe: z.optional(z.enum(VALID_TIMEFRAMES)),
});

export const ScanRequestSchema = z.object({
  rebuild: z.optional(z.boolean()),
  scopeDir: z.optional(z.string({ minLength: 1 })),
});

export const AuditRequestSchema = z.object({
  crawlRunId: z.optional(z.string({ minLength: 1 })),
});

export const CrawlRequestSchema = z.object({
  startUrl: z.string({ minLength: 4, url: true }),
  allowLocal: z.optional(z.boolean()),
  maxPages: z.optional(z.number({ min: 1, max: 2000, int: true })),
  maxDepth: z.optional(z.number({ min: 0, max: 10, int: true })),
});

export const CreateDecisionRequestSchema = z.object({
  title: z.string({ minLength: 2 }),
  rationale: z.string({ minLength: 2 }),
  findingId: z.optional(z.string({ minLength: 1 })),
});

export const CreateReportRequestSchema = z.object({
  format: z.optional(z.enum(VALID_REPORT_FORMATS)),
  reportType: z.optional(z.enum(VALID_REPORT_TYPES)),
  lang: z.optional(z.enum(VALID_LANGUAGES_LIST)),
});

export const PatchesRequestSchema = z.object({
  findingId: z.optional(z.string({ minLength: 1 })),
  ruleId: z.optional(z.enum(CORRIGEABLE_RULE_IDS)),
  pathPrefix: z.optional(z.string({ minLength: 1 })),
  force: z.optional(z.boolean()),
});
