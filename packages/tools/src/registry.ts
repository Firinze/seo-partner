import path from 'node:path';
import type {
  CodeVsCrawlComparisonRow,
  DecisionRecord,
  FtsSearchResult,
  OwnerRole,
  PrioritizedAction,
  RuleCategory,
  SeverityLevel,
  TargetTimeframe,
  ToolContext,
  ToolName,
  ToolResult,
} from '@seo-partner/core';
import {
  CrawlRepository,
  FindingRepository,
  ProjectRepository,
  RouteRepository,
  GscRepository,
  SeoDatabase,
} from '@seo-partner/store';
import {
  VALID_OWNER_ROLES,
  VALID_RULE_CATEGORIES,
  VALID_SEVERITIES,
  VALID_TIMEFRAMES,
} from './validator.js';
import { runScanCommand, type ScanCommandResult } from './engine/scan.js';
import { runAuditCommand, type AuditCommandResult } from './engine/audit.js';
import { compareCodeVsCrawl } from './engine/comparator.js';
import { recordDecision } from './engine/decisions.js';
import { ensureIndex } from './engine/ensure-index.js';
import { runGscSyncCommand, runGscInspectCommand } from './engine/gsc-sync.js';
import { runCwvFetchCommand } from './engine/cwv-fetch.js';
import { getBingPerformanceTool, inspectBingUrlTool } from './bing/tools.js';
import {
  applyPatchBatch,
  proposePatches,
} from './patch/patch-engine.js';
import type { PatchBatchResult } from '@seo-partner/core';

export interface ToolValidationResult<T> {
  readonly ok: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly fields?: ReadonlyArray<string>;
}

export interface ToolDefinition<TArgs = any, TData = any> {
  readonly name: ToolName;
  readonly title: { readonly en: string; readonly fr: string };
  readonly description: { readonly en: string; readonly fr: string };
  readonly inputSchema: Record<string, unknown>;
  readonly mutatesState: boolean;
  readonly validateArgs: (args: unknown) => ToolValidationResult<TArgs>;
  readonly execute: (ctx: ToolContext, args: TArgs) => Promise<ToolResult>;
}

// ---------------------------------------------------------------------------
// Helpers for strict argument validation against JSON Schema
// ---------------------------------------------------------------------------

function validateNoExtraProperties(
  record: Record<string, unknown>,
  allowedKeys: ReadonlyArray<string>,
): { readonly ok: true } | { readonly ok: false; readonly error: string; readonly fields: string[] } {
  const extraKeys = Object.keys(record).filter((k) => !allowedKeys.includes(k));
  if (extraKeys.length > 0) {
    return {
      ok: false,
      error: `Unknown argument(s): ${extraKeys.join(', ')}`,
      fields: extraKeys,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tool 1: scan
// ---------------------------------------------------------------------------

export interface ScanToolArgs {
  readonly rebuild?: boolean;
  readonly scopeDir?: string;
}

const scanTool: ToolDefinition<ScanToolArgs, ScanCommandResult> = {
  name: 'scan',
  title: {
    en: 'Scan project code and discover routes',
    fr: 'Scanner le code du projet et découvrir les routes',
  },
  description: {
    en: 'Performs static AST scan of the project and populates the local SQLite index',
    fr: 'Effectue un scan statique du projet et alimente l index SQLite local',
  },
  inputSchema: {
    type: 'object',
    properties: {
      rebuild: {
        type: 'boolean',
        description: 'Force a complete rebuild of the index from scratch',
      },
      scopeDir: {
        type: 'string',
        description: 'Limit scan to a specific subfolder',
      },
    },
    additionalProperties: false,
  },
  mutatesState: true,
  validateArgs(input: unknown): ToolValidationResult<ScanToolArgs> {
    if (input === undefined || input === null) return { ok: true, data: {} };
    if (typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const rec = input as Record<string, unknown>;
    const extraCheck = validateNoExtraProperties(rec, ['rebuild', 'scopeDir']);
    if (!extraCheck.ok) return extraCheck;

    if (rec.rebuild !== undefined && typeof rec.rebuild !== 'boolean') {
      return { ok: false, error: 'rebuild must be a boolean', fields: ['rebuild'] };
    }
    if (rec.scopeDir !== undefined && typeof rec.scopeDir !== 'string') {
      return { ok: false, error: 'scopeDir must be a string', fields: ['scopeDir'] };
    }
    return {
      ok: true,
      data: {
        rebuild: rec.rebuild as boolean | undefined,
        scopeDir: rec.scopeDir as string | undefined,
      },
    };
  },
  async execute(ctx: ToolContext, args: ScanToolArgs): Promise<ToolResult> {
    const result = await runScanCommand({
      projectRoot: ctx.projectRoot,
      rebuild: args.rebuild,
      scopeDir: args.scopeDir,
    });
    const summary =
      ctx.lang === 'fr'
        ? `Scan terminé : ${result.routesDiscovered} route(s) découverte(s), ${result.filesScanned} fichier(s) analysé(s) en ${result.durationMs}ms.`
        : `Scan completed: ${result.routesDiscovered} route(s) discovered, ${result.filesScanned} file(s) analyzed in ${result.durationMs}ms.`;
    return {
      ok: true,
      data: result,
      summary,
      initialScanPerformed: false,
    };
  },
};

// ---------------------------------------------------------------------------
// Tool 2: audit
// ---------------------------------------------------------------------------

export interface AuditToolArgs {
  readonly category?: RuleCategory;
  readonly severity?: SeverityLevel;
  readonly crawlRunId?: string;
}

const auditTool: ToolDefinition<AuditToolArgs, AuditCommandResult> = {
  name: 'audit',
  title: {
    en: 'Evaluate SEO rules',
    fr: 'Évaluer les règles d audit SEO',
  },
  description: {
    en: 'Evaluates SEO rules against scanned code and optional crawl run',
    fr: 'Évalue les règles SEO sur le code scanné et l éventuel crawl',
  },
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: VALID_RULE_CATEGORIES,
        description: 'Filter findings by category',
      },
      severity: {
        type: 'string',
        enum: VALID_SEVERITIES,
        description: 'Filter findings by severity level',
      },
      crawlRunId: {
        type: 'string',
        description: 'Optional ID of a crawl run to include in audit',
      },
    },
    additionalProperties: false,
  },
  mutatesState: false,
  validateArgs(input: unknown): ToolValidationResult<AuditToolArgs> {
    if (input === undefined || input === null) return { ok: true, data: {} };
    if (typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const rec = input as Record<string, unknown>;
    const extraCheck = validateNoExtraProperties(rec, ['category', 'severity', 'crawlRunId']);
    if (!extraCheck.ok) return extraCheck;

    if (
      rec.category !== undefined &&
      (!VALID_RULE_CATEGORIES.includes(rec.category as RuleCategory))
    ) {
      return {
        ok: false,
        error: `category must be one of: ${VALID_RULE_CATEGORIES.join(', ')}`,
        fields: ['category'],
      };
    }
    if (
      rec.severity !== undefined &&
      (!VALID_SEVERITIES.includes(rec.severity as SeverityLevel))
    ) {
      return {
        ok: false,
        error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}`,
        fields: ['severity'],
      };
    }
    if (rec.crawlRunId !== undefined && typeof rec.crawlRunId !== 'string') {
      return { ok: false, error: 'crawlRunId must be a string', fields: ['crawlRunId'] };
    }

    return {
      ok: true,
      data: {
        category: rec.category as RuleCategory | undefined,
        severity: rec.severity as SeverityLevel | undefined,
        crawlRunId: rec.crawlRunId as string | undefined,
      },
    };
  },
  async execute(ctx: ToolContext, args: AuditToolArgs): Promise<ToolResult> {
    const { initialScanPerformed } = await ensureIndex(ctx.projectRoot);
    const result = await runAuditCommand({
      projectRoot: ctx.projectRoot,
      category: args.category,
      severity: args.severity,
      crawlRunId: args.crawlRunId,
    });
    const prefix =
      initialScanPerformed
        ? ctx.lang === 'fr'
          ? 'scan initial effectué. '
          : 'initial scan performed. '
        : '';
    const summary =
      ctx.lang === 'fr'
        ? `${prefix}Audit terminé : ${result.totalFindings} constat(s) dont ${result.blockingIndexingCount} bloquant(s) pour l'indexation.`
        : `${prefix}Audit completed: ${result.totalFindings} finding(s) including ${result.blockingIndexingCount} indexing blocker(s).`;

    return {
      ok: true,
      data: result,
      summary,
      initialScanPerformed,
    };
  },
};

// ---------------------------------------------------------------------------
// Tool 3: backlog
// ---------------------------------------------------------------------------

export interface BacklogToolArgs {
  readonly quickWinsOnly?: boolean;
  readonly ownerRole?: OwnerRole;
  readonly targetTimeframe?: TargetTimeframe;
}

export interface BacklogResultData {
  readonly total: number;
  readonly items: ReadonlyArray<PrioritizedAction>;
}

const backlogTool: ToolDefinition<BacklogToolArgs, BacklogResultData> = {
  name: 'backlog',
  title: {
    en: 'List prioritized backlog actions',
    fr: 'Lister les actions priorisées du backlog',
  },
  description: {
    en: 'Retrieves ICE-prioritized actions with F-R3 indexation blockers sorted first',
    fr: 'Récupère les actions priorisées ICE avec les blocages d indexation F-R3 en tête',
  },
  inputSchema: {
    type: 'object',
    properties: {
      quickWinsOnly: {
        type: 'boolean',
        description: 'Filter only actions with ICE >= 7 and Effort >= 8 (quick wins)',
      },
      ownerRole: {
        type: 'string',
        enum: VALID_OWNER_ROLES,
        description: 'Filter by owner role (dev, content, outreach)',
      },
      targetTimeframe: {
        type: 'string',
        enum: VALID_TIMEFRAMES,
        description: 'Filter by target timeframe (immediate, 30-days, 90-days)',
      },
    },
    additionalProperties: false,
  },
  mutatesState: false,
  validateArgs(input: unknown): ToolValidationResult<BacklogToolArgs> {
    if (input === undefined || input === null) return { ok: true, data: {} };
    if (typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const rec = input as Record<string, unknown>;
    const extraCheck = validateNoExtraProperties(rec, ['quickWinsOnly', 'ownerRole', 'targetTimeframe']);
    if (!extraCheck.ok) return extraCheck;

    if (rec.quickWinsOnly !== undefined && typeof rec.quickWinsOnly !== 'boolean') {
      return { ok: false, error: 'quickWinsOnly must be a boolean', fields: ['quickWinsOnly'] };
    }
    if (
      rec.ownerRole !== undefined &&
      (!VALID_OWNER_ROLES.includes(rec.ownerRole as OwnerRole))
    ) {
      return {
        ok: false,
        error: `ownerRole must be one of: ${VALID_OWNER_ROLES.join(', ')}`,
        fields: ['ownerRole'],
      };
    }
    if (
      rec.targetTimeframe !== undefined &&
      (!VALID_TIMEFRAMES.includes(rec.targetTimeframe as TargetTimeframe))
    ) {
      return {
        ok: false,
        error: `targetTimeframe must be one of: ${VALID_TIMEFRAMES.join(', ')}`,
        fields: ['targetTimeframe'],
      };
    }

    return {
      ok: true,
      data: {
        quickWinsOnly: rec.quickWinsOnly as boolean | undefined,
        ownerRole: rec.ownerRole as OwnerRole | undefined,
        targetTimeframe: rec.targetTimeframe as TargetTimeframe | undefined,
      },
    };
  },
  async execute(ctx: ToolContext, args: BacklogToolArgs): Promise<ToolResult> {
    const { initialScanPerformed } = await ensureIndex(ctx.projectRoot);
    const store = SeoDatabase.open(path.resolve(ctx.projectRoot));
    let items: PrioritizedAction[] = [];
    try {
      const repo = new FindingRepository(store);
      const raw = repo.listPrioritizedActions({ quickWinsOnly: args.quickWinsOnly });
      let filtered = raw;
      if (args.ownerRole) {
        filtered = filtered.filter((a) => a.ownerRole === args.ownerRole);
      }
      if (args.targetTimeframe) {
        filtered = filtered.filter((a) => a.targetTimeframe === args.targetTimeframe);
      }

      // Sort F-R3 indexation blockers first, then descending by ICE score
      items = [...filtered].sort((a, b) => {
        if (a.blocksIndexing && !b.blocksIndexing) return -1;
        if (!a.blocksIndexing && b.blocksIndexing) return 1;
        return b.ice.score - a.ice.score;
      });
    } finally {
      store.close();
    }

    const prefix =
      initialScanPerformed
        ? ctx.lang === 'fr'
          ? 'scan initial effectué. '
          : 'initial scan performed. '
        : '';
    const summary =
      ctx.lang === 'fr'
        ? `${prefix}Backlog : ${items.length} action(s) priorisée(s).`
        : `${prefix}Backlog: ${items.length} prioritized action(s).`;

    return {
      ok: true,
      data: { total: items.length, items },
      summary,
      initialScanPerformed,
    };
  },
};

// ---------------------------------------------------------------------------
// Tool 4: search_fts
// ---------------------------------------------------------------------------

export interface SearchFtsToolArgs {
  readonly query: string;
  readonly limit?: number;
}

export interface SearchFtsResultData {
  readonly query: string;
  readonly durationMs: number;
  readonly results: ReadonlyArray<FtsSearchResult>;
}

const searchFtsTool: ToolDefinition<SearchFtsToolArgs, SearchFtsResultData> = {
  name: 'search_fts',
  title: {
    en: 'Full-text search in routes and index',
    fr: 'Recherche plein texte dans les routes et l index',
  },
  description: {
    en: 'Performs fast SQLite FTS5 search across indexed routes, content, and findings',
    fr: 'Effectue une recherche rapide SQLite FTS5 dans les routes, contenus et constats indexés',
  },
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Keywords to search in routes, titles, descriptions and headings',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of results to return (default: 20)',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  mutatesState: false,
  validateArgs(input: unknown): ToolValidationResult<SearchFtsToolArgs> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const rec = input as Record<string, unknown>;
    const extraCheck = validateNoExtraProperties(rec, ['query', 'limit']);
    if (!extraCheck.ok) return extraCheck;

    if (typeof rec.query !== 'string' || rec.query.trim().length === 0) {
      return { ok: false, error: 'query is required and must not be empty', fields: ['query'] };
    }
    if (rec.query.trim().length > 200) {
      return { ok: false, error: 'query must not exceed 200 characters', fields: ['query'] };
    }
    let limitNum: number | undefined;
    if (rec.limit !== undefined) {
      if (typeof rec.limit !== 'number' || !Number.isInteger(rec.limit) || rec.limit < 1 || rec.limit > 100) {
        return { ok: false, error: 'limit must be an integer between 1 and 100', fields: ['limit'] };
      }
      limitNum = rec.limit;
    }

    return {
      ok: true,
      data: {
        query: rec.query.trim(),
        limit: limitNum,
      },
    };
  },
  async execute(ctx: ToolContext, args: SearchFtsToolArgs): Promise<ToolResult> {
    const start = Date.now();
    const { initialScanPerformed } = await ensureIndex(ctx.projectRoot);
    const store = SeoDatabase.open(path.resolve(ctx.projectRoot));
    let results: ReadonlyArray<FtsSearchResult> = [];
    try {
      const project = new ProjectRepository(store).getLatestProject();
      if (project) {
        const routeRepo = new RouteRepository(store);
        results = routeRepo.searchFts(project.id, args.query, args.limit ?? 20);
      }
    } finally {
      store.close();
    }

    const durationMs = Date.now() - start;
    const prefix =
      initialScanPerformed
        ? ctx.lang === 'fr'
          ? 'scan initial effectué. '
          : 'initial scan performed. '
        : '';
    const summary =
      ctx.lang === 'fr'
        ? `${prefix}Recherche FTS pour "${args.query}" : ${results.length} résultat(s) en ${durationMs}ms.`
        : `${prefix}FTS search for "${args.query}": ${results.length} result(s) in ${durationMs}ms.`;

    return {
      ok: true,
      data: {
        query: args.query,
        durationMs,
        results,
      },
      summary,
      initialScanPerformed,
    };
  },
};

// ---------------------------------------------------------------------------
// Tool 5: compare_code_crawl
// ---------------------------------------------------------------------------

export interface CompareCodeCrawlToolArgs {
  readonly crawlRunId?: string;
}

export interface CompareCodeCrawlResultData {
  readonly crawlRunId: string | null;
  readonly totalRows: number;
  readonly divergentRowsCount: number;
  readonly rows: ReadonlyArray<CodeVsCrawlComparisonRow>;
  readonly untrustedExternal: true;
}

const compareCodeCrawlTool: ToolDefinition<CompareCodeCrawlToolArgs, CompareCodeCrawlResultData> = {
  name: 'compare_code_crawl',
  title: {
    en: 'Compare code declared state vs HTTP crawl',
    fr: 'Comparer l état déclaré dans le code vs crawl HTTP',
  },
  description: {
    en: 'Detects divergences between code routes and crawled HTTP pages (titles, canonical, robots, status)',
    fr: 'Détecte les divergences entre routes du code et pages crawleés (titres, canonique, robots, statut)',
  },
  inputSchema: {
    type: 'object',
    properties: {
      crawlRunId: {
        type: 'string',
        description: 'Optional ID of a specific crawl run to compare against',
      },
    },
    additionalProperties: false,
  },
  mutatesState: false,
  validateArgs(input: unknown): ToolValidationResult<CompareCodeCrawlToolArgs> {
    if (input === undefined || input === null) return { ok: true, data: {} };
    if (typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const rec = input as Record<string, unknown>;
    const extraCheck = validateNoExtraProperties(rec, ['crawlRunId']);
    if (!extraCheck.ok) return extraCheck;

    if (rec.crawlRunId !== undefined && typeof rec.crawlRunId !== 'string') {
      return { ok: false, error: 'crawlRunId must be a string', fields: ['crawlRunId'] };
    }
    return {
      ok: true,
      data: {
        crawlRunId: rec.crawlRunId as string | undefined,
      },
    };
  },
  async execute(ctx: ToolContext, args: CompareCodeCrawlToolArgs): Promise<ToolResult> {
    const { initialScanPerformed } = await ensureIndex(ctx.projectRoot);
    const store = SeoDatabase.open(path.resolve(ctx.projectRoot));
    let rows: ReadonlyArray<CodeVsCrawlComparisonRow> = [];
    let crawlRunId: string | null = null;
    try {
      const project = new ProjectRepository(store).getLatestProject();
      if (!project) {
        throw new Error('Project index not initialized');
      }
      const routeRepo = new RouteRepository(store);
      const crawlRepo = new CrawlRepository(store);

      const routes = routeRepo.loadExtractedRoutes(project.id);
      const activeCrawlRun = args.crawlRunId
        ? crawlRepo.getCrawlRunById(args.crawlRunId)
        : crawlRepo.getLatestCompletedCrawlRun(project.id);
      crawlRunId = activeCrawlRun?.id ?? null;
      const crawlPages = activeCrawlRun ? crawlRepo.getCrawlPages(activeCrawlRun.id) : [];

      rows = compareCodeVsCrawl(routes, crawlPages);
    } finally {
      store.close();
    }

    const divergentCount = rows.filter((r) => r.divergences.length > 0).length;
    const prefix =
      initialScanPerformed
        ? ctx.lang === 'fr'
          ? 'scan initial effectué. '
          : 'initial scan performed. '
        : '';
    const warning =
      ctx.lang === 'fr'
        ? '[Attention : contenu externe non fiable balisé] '
        : '[Warning: untrusted external content tagged] ';
    const summary =
      ctx.lang === 'fr'
        ? `${prefix}${warning}Comparaison code vs crawl : ${rows.length} route(s), ${divergentCount} divergence(s).`
        : `${prefix}${warning}Code vs crawl comparison: ${rows.length} route(s), ${divergentCount} divergence(s).`;

    return {
      ok: true,
      data: {
        crawlRunId,
        totalRows: rows.length,
        divergentRowsCount: divergentCount,
        rows,
        untrustedExternal: true,
      },
      summary,
      initialScanPerformed,
    };
  },
};

// ---------------------------------------------------------------------------
// Tool 6: record_decision
// ---------------------------------------------------------------------------

export interface RecordDecisionToolArgs {
  readonly title: string;
  readonly rationale: string;
  readonly findingId?: string;
}

const recordDecisionTool: ToolDefinition<RecordDecisionToolArgs, DecisionRecord> = {
  name: 'record_decision',
  title: {
    en: 'Record architectural or SEO decision',
    fr: 'Enregistrer une décision SEO ou d architecture',
  },
  description: {
    en: 'Persists an SEO decision to SQLite index and .seo/decisions.md',
    fr: 'Persiste une décision SEO dans l index SQLite et dans .seo/decisions.md',
  },
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        minLength: 2,
        description: 'Title of the decision',
      },
      rationale: {
        type: 'string',
        minLength: 2,
        description: 'Rationale and justification for the decision',
      },
      findingId: {
        type: 'string',
        description: 'Optional ID of the related finding',
      },
    },
    required: ['title', 'rationale'],
    additionalProperties: false,
  },
  mutatesState: true,
  validateArgs(input: unknown): ToolValidationResult<RecordDecisionToolArgs> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const rec = input as Record<string, unknown>;
    const extraCheck = validateNoExtraProperties(rec, ['title', 'rationale', 'findingId']);
    if (!extraCheck.ok) return extraCheck;

    if (typeof rec.title !== 'string' || rec.title.trim().length < 2) {
      return { ok: false, error: 'title is required and must contain at least 2 characters', fields: ['title'] };
    }
    if (typeof rec.rationale !== 'string' || rec.rationale.trim().length < 2) {
      return { ok: false, error: 'rationale is required and must contain at least 2 characters', fields: ['rationale'] };
    }
    if (rec.findingId !== undefined && typeof rec.findingId !== 'string') {
      return { ok: false, error: 'findingId must be a string', fields: ['findingId'] };
    }

    return {
      ok: true,
      data: {
        title: rec.title.trim(),
        rationale: rec.rationale.trim(),
        findingId: rec.findingId as string | undefined,
      },
    };
  },
  async execute(ctx: ToolContext, args: RecordDecisionToolArgs): Promise<ToolResult> {
    const saved = recordDecision({
      projectRoot: ctx.projectRoot,
      title: args.title,
      rationale: args.rationale,
      findingId: args.findingId,
    });
    const summary =
      ctx.lang === 'fr'
        ? `Décision enregistrée : "${saved.title}" (${saved.date}) dans .seo/decisions.md et l index SQLite.`
        : `Decision recorded: "${saved.title}" (${saved.date}) in .seo/decisions.md and SQLite index.`;

    return {
      ok: true,
      data: saved,
      summary,
      initialScanPerformed: false,
    };
  },
};

// ---------------------------------------------------------------------------
// Tool 7: propose_patch
// ---------------------------------------------------------------------------

export interface ProposePatchToolArgs {
  readonly findingId?: string;
  readonly ruleId?: string;
  readonly apply?: boolean;
  readonly force?: boolean;
}

const proposePatchTool: ToolDefinition<ProposePatchToolArgs, PatchBatchResult> = {
  name: 'propose_patch',
  title: {
    en: 'Propose deterministic unified diff patches for findings',
    fr: 'Proposer des correctifs déterministes sous forme de diff unifié',
  },
  description: {
    en: 'Generates non-destructive unified diffs for actionable findings (robots.txt, sitemap, noindex, title, canonical, lang, description)',
    fr: 'Génère des diffs unifiés non destructifs pour les constats réparables (robots.txt, sitemap, noindex, titre, canonique, langue, description)',
  },
  inputSchema: {
    type: 'object',
    properties: {
      findingId: {
        type: 'string',
        description: 'Optional finding ID to target a single anomaly',
      },
      ruleId: {
        type: 'string',
        description: 'Optional rule ID (e.g. R-TECH-01, R-TECH-02, R-TECH-03, R-TECH-05, R-TECH-14, R-ONPAGE-01, R-ONPAGE-04)',
      },
      apply: {
        type: 'boolean',
        description: 'Apply the patch to files after backup (requires server started with --allow-apply)',
      },
      force: {
        type: 'boolean',
        description: 'Force application even if files have uncommitted Git modifications',
      },
    },
    additionalProperties: false,
  },
  mutatesState: true,
  validateArgs(input: unknown): ToolValidationResult<ProposePatchToolArgs> {
    if (input === undefined || input === null) return { ok: true, data: {} };
    if (typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const rec = input as Record<string, unknown>;
    const extraCheck = validateNoExtraProperties(rec, ['findingId', 'ruleId', 'apply', 'force']);
    if (!extraCheck.ok) return extraCheck;

    if (rec.findingId !== undefined && typeof rec.findingId !== 'string') {
      return { ok: false, error: 'findingId must be a string', fields: ['findingId'] };
    }
    if (rec.ruleId !== undefined && typeof rec.ruleId !== 'string') {
      return { ok: false, error: 'ruleId must be a string', fields: ['ruleId'] };
    }
    if (rec.apply !== undefined && typeof rec.apply !== 'boolean') {
      return { ok: false, error: 'apply must be a boolean', fields: ['apply'] };
    }
    if (rec.force !== undefined && typeof rec.force !== 'boolean') {
      return { ok: false, error: 'force must be a boolean', fields: ['force'] };
    }

    return {
      ok: true,
      data: {
        findingId: rec.findingId as string | undefined,
        ruleId: rec.ruleId as string | undefined,
        apply: rec.apply as boolean | undefined,
        force: rec.force as boolean | undefined,
      },
    };
  },
  async execute(ctx: ToolContext, args: ProposePatchToolArgs): Promise<ToolResult> {
    if (args.apply && !ctx.allowApply) {
      const refusal = {
        code: 'apply-not-allowed',
        files: [],
        message:
          "MCP server started in read-only mode for code. Restart server with 'seo-partner mcp --allow-apply' to permit applying code patches.",
      };
      throw refusal;
    }

    let batch = await proposePatches({
      projectRoot: ctx.projectRoot,
      findingId: args.findingId,
      ruleId: args.ruleId,
      lang: ctx.lang,
    });

    if (args.apply) {
      batch = await applyPatchBatch(ctx.projectRoot, batch, { force: args.force });
    }

    const prefix = batch.initialScanPerformed
      ? ctx.lang === 'fr'
        ? 'scan initial effectué. '
        : 'initial scan performed. '
      : '';

    let summary: string;
    if (batch.applied) {
      summary =
        ctx.lang === 'fr'
          ? `${prefix}Correctifs appliqués (${batch.proposals.length} fichier(s) modifiés). Sauvegarde : ${batch.backupDir}. ${batch.todoMarkersRemaining} marqueur(s) TODO-SEO à compléter.`
          : `${prefix}Patches applied (${batch.proposals.length} file(s) modified). Backup: ${batch.backupDir}. ${batch.todoMarkersRemaining} TODO-SEO marker(s) remaining to review.`;
    } else {
      summary =
        ctx.lang === 'fr'
          ? `${prefix}Lot ${batch.batchId} proposé (${batch.proposals.length} correctif(s), ${batch.skipped.length} ignoré(s), ${batch.todoMarkersRemaining} marqueur(s) TODO-SEO). Aucun fichier modifié.`
          : `${prefix}Batch ${batch.batchId} proposed (${batch.proposals.length} patch(es), ${batch.skipped.length} skipped, ${batch.todoMarkersRemaining} TODO-SEO marker(s)). Zero files modified.`;
    }

    return {
      ok: true,
      data: batch,
      summary,
      initialScanPerformed: batch.initialScanPerformed,
    };
  },
};

// ---------------------------------------------------------------------------
// GSC Performance Tool
// ---------------------------------------------------------------------------

export interface GetGscPerformanceArgs {
  readonly siteUrl: string;
  readonly url?: string;
  readonly days?: number;
  readonly sync?: boolean;
}

export const getGscPerformanceTool: ToolDefinition<GetGscPerformanceArgs> = {
  name: 'get_gsc_performance',
  title: {
    en: 'Get GSC Search Performance',
    fr: 'Obtenir les performances Search Console',
  },
  description: {
    en: 'Fetch or query search performance metrics (clicks, impressions, ctr, position) from Google Search Console.',
    fr: 'Récupérer ou interroger les métriques de performance de recherche (clics, impressions, ctr, position) de Google Search Console.',
  },
  inputSchema: {
    type: 'object',
    properties: {
      siteUrl: { type: 'string', description: 'Google Search Console verified site URL (e.g. https://example.com/)' },
      url: { type: 'string', description: 'Filter performance metrics to a specific page URL' },
      days: { type: 'number', description: 'Number of past days of performance data (default 28)' },
      sync: { type: 'boolean', description: 'Force a live sync from GSC API before reading' },
    },
    required: ['siteUrl'],
    additionalProperties: false,
  },
  mutatesState: false,
  validateArgs(args: unknown): ToolValidationResult<GetGscPerformanceArgs> {
    if (!args || typeof args !== 'object') {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const a = args as Record<string, unknown>;
    if (typeof a['siteUrl'] !== 'string' || !a['siteUrl'].trim()) {
      return { ok: false, error: 'siteUrl must be a non-empty string' };
    }
    return {
      ok: true,
      data: {
        siteUrl: String(a['siteUrl']).trim(),
        url: typeof a['url'] === 'string' ? a['url'].trim() : undefined,
        days: typeof a['days'] === 'number' ? a['days'] : undefined,
        sync: typeof a['sync'] === 'boolean' ? a['sync'] : false,
      },
    };
  },
  async execute(ctx: ToolContext, args: GetGscPerformanceArgs): Promise<ToolResult> {
    if (args.sync) {
      await runGscSyncCommand({
        projectRoot: ctx.projectRoot,
        siteUrl: args.siteUrl,
        days: args.days,
      });
    }

    const store = SeoDatabase.open(ctx.projectRoot);
    try {
      const projectRepo = new ProjectRepository(store);
      let project = projectRepo.getLatestProject();
      if (!project) {
        await runScanCommand({ projectRoot: ctx.projectRoot });
        project = projectRepo.getLatestProject();
      }

      if (!project) {
        return {
          ok: false,
          data: null,
          summary: ctx.lang === 'fr' ? 'Projet non initialisé.' : 'Project not initialized.',
          initialScanPerformed: true,
        };
      }

      const gscRepo = new GscRepository(store);
      const records = args.url
        ? gscRepo.getPerformanceByUrl(project.id, args.url)
        : gscRepo.listTopQueries(project.id);

      const summary =
        ctx.lang === 'fr'
          ? `${records.length} métrique(s) GSC trouvée(s) pour ${args.siteUrl}.`
          : `Found ${records.length} GSC performance record(s) for ${args.siteUrl}.`;

      return {
        ok: true,
        data: { siteUrl: args.siteUrl, recordsCount: records.length, records },
        summary,
        initialScanPerformed: false,
      };
    } finally {
      store.close();
    }
  },
};

// ---------------------------------------------------------------------------
// GSC Inspect Tool
// ---------------------------------------------------------------------------

export interface InspectGscUrlArgs {
  readonly siteUrl: string;
  readonly url: string;
}

export const inspectGscUrlTool: ToolDefinition<InspectGscUrlArgs> = {
  name: 'inspect_gsc_url',
  title: {
    en: 'Inspect URL in GSC',
    fr: 'Inspecter une URL dans Search Console',
  },
  description: {
    en: 'Inspect indexation status, coverage, and Googlebot crawl state for an URL via GSC URL Inspection API.',
    fr: 'Inspecter le statut d indexation, la couverture et l état de crawl Googlebot d une URL via l API URL Inspection de GSC.',
  },
  inputSchema: {
    type: 'object',
    properties: {
      siteUrl: { type: 'string', description: 'Google Search Console verified site URL' },
      url: { type: 'string', description: 'The absolute URL to inspect' },
    },
    required: ['siteUrl', 'url'],
    additionalProperties: false,
  },
  mutatesState: false,
  validateArgs(args: unknown): ToolValidationResult<InspectGscUrlArgs> {
    if (!args || typeof args !== 'object') {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const a = args as Record<string, unknown>;
    if (typeof a['siteUrl'] !== 'string' || !a['siteUrl'].trim()) {
      return { ok: false, error: 'siteUrl must be a non-empty string' };
    }
    if (typeof a['url'] !== 'string' || !a['url'].trim()) {
      return { ok: false, error: 'url must be a non-empty string' };
    }
    return {
      ok: true,
      data: {
        siteUrl: String(a['siteUrl']).trim(),
        url: String(a['url']).trim(),
      },
    };
  },
  async execute(ctx: ToolContext, args: InspectGscUrlArgs): Promise<ToolResult> {
    const res = await runGscInspectCommand({
      projectRoot: ctx.projectRoot,
      siteUrl: args.siteUrl,
      url: args.url,
    });

    if (!res.success || !res.record) {
      return {
        ok: false,
        data: { error: res.error ?? 'GSC URL Inspection failed' },
        summary: ctx.lang === 'fr' ? `Échec inspection GSC : ${res.error}` : `GSC inspection failed: ${res.error}`,
        initialScanPerformed: false,
      };
    }

    const summary =
      ctx.lang === 'fr'
        ? `Inspection GSC ${args.url} : verdict ${res.record.verdict}, couverture : ${res.record.coverageState}.`
        : `GSC inspection for ${args.url}: verdict ${res.record.verdict}, coverage: ${res.record.coverageState}.`;

    return {
      ok: true,
      data: res.record,
      summary,
      initialScanPerformed: false,
    };
  },
};

// ---------------------------------------------------------------------------
// CWV Metrics Tool
// ---------------------------------------------------------------------------

export interface GetCwvMetricsArgs {
  readonly url: string;
  readonly formFactor?: 'PHONE' | 'DESKTOP' | 'ALL';
  readonly refresh?: boolean;
}

export const getCwvMetricsTool: ToolDefinition<GetCwvMetricsArgs> = {
  name: 'get_cwv_metrics',
  title: {
    en: 'Get Core Web Vitals Metrics',
    fr: 'Obtenir les métriques Core Web Vitals',
  },
  description: {
    en: 'Fetch and evaluate field Core Web Vitals (LCP, INP, CLS, FCP, TTFB) from CrUX or PageSpeed with 7-day TTL cache.',
    fr: 'Récupérer et évaluer les signaux Core Web Vitals réels (LCP, INP, CLS, FCP, TTFB) depuis CrUX ou PageSpeed avec cache TTL 7 jours.',
  },
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The absolute URL to check CWV for' },
      formFactor: {
        type: 'string',
        enum: ['PHONE', 'DESKTOP', 'ALL'],
        description: 'Form factor (PHONE, DESKTOP, or ALL)',
      },
      refresh: {
        type: 'boolean',
        description: 'Bypass local 7-day SQLite cache and force fresh API fetch',
      },
    },
    required: ['url'],
    additionalProperties: false,
  },
  mutatesState: false,
  validateArgs(args: unknown): ToolValidationResult<GetCwvMetricsArgs> {
    if (!args || typeof args !== 'object') {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const a = args as Record<string, unknown>;
    if (typeof a['url'] !== 'string' || !a['url'].trim()) {
      return { ok: false, error: 'url must be a non-empty string' };
    }
    const ff = a['formFactor'];
    if (ff !== undefined && ff !== 'PHONE' && ff !== 'DESKTOP' && ff !== 'ALL') {
      return { ok: false, error: 'formFactor must be PHONE, DESKTOP, or ALL' };
    }
    return {
      ok: true,
      data: {
        url: String(a['url']).trim(),
        formFactor: ff as 'PHONE' | 'DESKTOP' | 'ALL' | undefined,
        refresh: Boolean(a['refresh']),
      },
    };
  },
  async execute(ctx: ToolContext, args: GetCwvMetricsArgs): Promise<ToolResult> {
    const res = await runCwvFetchCommand({
      projectRoot: ctx.projectRoot,
      url: args.url,
      formFactor: args.formFactor,
      refresh: args.refresh,
    });

    if (!res.success) {
      return {
        ok: false,
        data: { error: res.error ?? 'Failed to fetch CWV metrics' },
        summary: ctx.lang === 'fr' ? `Échec récupération CWV : ${res.error}` : `CWV fetch failed: ${res.error}`,
        initialScanPerformed: false,
      };
    }

    const summary =
      ctx.lang === 'fr'
        ? `${res.records.length} métrique(s) CWV obtenue(s) pour ${args.url} (cache: ${res.cached}).`
        : `Retrieved ${res.records.length} CWV metric(s) for ${args.url} (cached: ${res.cached}).`;

    return {
      ok: true,
      data: { url: args.url, cached: res.cached, records: res.records },
      summary,
      initialScanPerformed: false,
    };
  },
};

// ---------------------------------------------------------------------------
// Tool Registry Map & Management Functions
// ---------------------------------------------------------------------------

const registry = new Map<ToolName, ToolDefinition>([
  ['scan', scanTool],
  ['audit', auditTool],
  ['backlog', backlogTool],
  ['search_fts', searchFtsTool],
  ['compare_code_crawl', compareCodeCrawlTool],
  ['record_decision', recordDecisionTool],
  ['propose_patch', proposePatchTool],
  ['get_gsc_performance', getGscPerformanceTool],
  ['inspect_gsc_url', inspectGscUrlTool],
  ['get_cwv_metrics', getCwvMetricsTool],
  ['get_bing_performance', getBingPerformanceTool],
  ['inspect_bing_url', inspectBingUrlTool],
]);

export function registerTool(tool: ToolDefinition): void {
  registry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name as ToolName);
}

export function listTools(): ReadonlyArray<ToolDefinition> {
  return Array.from(registry.values());
}

export const TOOL_REGISTRY = registry;
