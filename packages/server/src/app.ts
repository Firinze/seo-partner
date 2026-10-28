import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import {
  appendDecisionToFile,
  loadSeoConfig,
  walkProjectFiles,
  type DashboardOverview,
  type DecisionRecord,
  type ExtractedRouteData,
  type Finding,
  type ProjectRecord,
  type ReportFormat,
  type ReportType,
  type RuleCategory,
  type ScannedFile,
  type SeverityLevel,
  type SupportedLanguage,
} from '@seo-partner/core';
import {
  CrawlRepository,
  DecisionRepository,
  FindingRepository,
  ProjectRepository,
  RouteRepository,
  SeoDatabase,
} from '@seo-partner/store';
import {
  detectActiveAdapters,
  parseRobotsFiles,
  parseSitemapFiles,
} from '@seo-partner/adapters';
import { runHttpCrawler } from '@seo-partner/crawler';
import {
  ALL_V02_RULES,
  runRulesEngine,
  writeHtmlReport,
  writeMarkdownReport,
} from '@seo-partner/rules';
import { renderDashboardSpaHtml } from '@seo-partner/dashboard';
import {
  buildCorsHeaders,
  buildErrorEnvelope,
  buildSessionSetCookieHeader,
  buildSuccessEnvelope,
  generateSessionToken,
  isAllowedLocalOrigin,
  isLoopbackHost,
  verifySessionRequest,
} from './security.js';
import {
  AuditRequestSchema,
  BacklogQuerySchema,
  CrawlRequestSchema,
  CreateDecisionRequestSchema,
  CreateReportRequestSchema,
  FindingsQuerySchema,
  ScanRequestSchema,
  SearchQuerySchema,
} from './validator.js';
import { buildOpenApiSpec } from './openapi.js';
import { compareCodeVsCrawl } from './comparator.js';

export interface LocalApiAppOptions {
  readonly projectRoot: string;
  readonly port?: number;
  readonly defaultLang?: SupportedLanguage;
  readonly sessionToken?: string;
  readonly customDnsLookup?: (hostname: string) => Promise<ReadonlyArray<string>>;
}

export interface LocalApiApp {
  readonly request: (input: string | Request, init?: RequestInit) => Promise<Response>;
  readonly getSessionToken: () => string;
  readonly getPort: () => number;
  readonly setPort: (port: number) => void;
}

export interface StartLocalServerOptions extends LocalApiAppOptions {
  readonly maxPortRetries?: number;
}

export interface RunningLocalServer {
  readonly app: LocalApiApp;
  readonly server: http.Server;
  readonly host: '127.0.0.1';
  readonly requestedPort: number;
  readonly port: number;
  readonly fallbackUsed: boolean;
  readonly url: string;
  readonly close: () => Promise<void>;
}

function computeProjectId(projectRoot: string): string {
  const normalized = path.resolve(projectRoot).replace(/\\/g, '/').toLowerCase();
  const digest = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 8);
  return `proj_${digest}`;
}

async function executeProjectScan(
  projectRoot: string,
  options?: { readonly rebuild?: boolean; readonly scopeDir?: string },
): Promise<{
  readonly projectId: string;
  readonly projectName: string;
  readonly frameworks: ReadonlyArray<string>;
  readonly incremental: boolean;
  readonly durationMs: number;
  readonly filesScanned: number;
  readonly routesDiscovered: number;
}> {
  const startTime = Date.now();
  const resolvedRoot = path.resolve(projectRoot);
  const config = loadSeoConfig(resolvedRoot);
  const projectId = computeProjectId(resolvedRoot);
  const projectName = config?.projectName ?? (path.basename(resolvedRoot) || 'seo-project');

  const store = SeoDatabase.open(resolvedRoot, { rebuild: options?.rebuild });
  try {
    const projectRepo = new ProjectRepository(store);
    const routeRepo = new RouteRepository(store);

    const existingFilesByPath: Map<string, ScannedFile> = options?.rebuild
      ? new Map()
      : projectRepo.getExistingFilesByPath(projectId);
    const incremental = !options?.rebuild && existingFilesByPath.size > 0;

    const walkRes = await walkProjectFiles({
      projectRoot: resolvedRoot,
      projectId,
      scopeDir: options?.scopeDir,
      maxFileSizeKb: config?.maxFileSizeKb ?? 1024,
      extraExcludePatterns: config?.excludePatterns,
      existingFilesByPath: incremental ? existingFilesByPath : undefined,
    });

    const filePaths = walkRes.files.map((f) => f.path);
    const robotsInfo = parseRobotsFiles(filePaths, walkRes.contentsByPath);
    const sitemapInfo = parseSitemapFiles(filePaths, walkRes.contentsByPath);

    const activeAdapters = await detectActiveAdapters(
      resolvedRoot,
      filePaths,
      walkRes.contentsByPath,
    );

    const extractedRoutes: ExtractedRouteData[] = [];
    const seenRouteKeys = new Set<string>();

    for (const adapter of activeAdapters) {
      const discovered = await adapter.discoverRoutes(
        resolvedRoot,
        filePaths,
        walkRes.contentsByPath,
        sitemapInfo.routePaths,
      );
      for (const route of discovered) {
        const key = `${route.routerKind}:${route.pattern}`;
        if (seenRouteKeys.has(key)) continue;
        seenRouteKeys.add(key);

        const content = walkRes.contentsByPath.get(route.filePath) ?? '';
        const extracted = await adapter.extractRoute(resolvedRoot, route, content);
        extractedRoutes.push(extracted);
      }
    }

    const now = new Date().toISOString();
    const projectRecord: ProjectRecord = {
      id: projectId,
      rootPath: resolvedRoot,
      name: projectName,
      frameworks: activeAdapters.map((a) => a.id),
      hasRobotsTxt: robotsInfo.exists,
      hasSitemap: sitemapInfo.exists,
      createdAt: config?.createdAt ?? now,
      lastScannedAt: now,
    };

    store.runInTransaction(() => {
      projectRepo.upsertProject(projectRecord);
      const fileIdByPath = projectRepo.replaceProjectFiles(projectId, walkRes.files);
      routeRepo.replaceExtractedRoutes(projectId, fileIdByPath, extractedRoutes);
    });

    return {
      projectId,
      projectName,
      frameworks: projectRecord.frameworks,
      incremental,
      durationMs: Date.now() - startTime,
      filesScanned: walkRes.files.length,
      routesDiscovered: extractedRoutes.length,
    };
  } finally {
    store.close();
  }
}

async function executeProjectAudit(
  projectRoot: string,
  crawlRunId?: string,
): Promise<{
  readonly projectId: string;
  readonly crawlRunId: string | null;
  readonly activeRulesCount: number;
  readonly totalFindings: number;
  readonly blockingIndexingCount: number;
  readonly bySeverity: Record<SeverityLevel, number>;
}> {
  const resolvedRoot = path.resolve(projectRoot);
  let store = SeoDatabase.open(resolvedRoot);
  let project = new ProjectRepository(store).getLatestProject();
  store.close();

  if (!project) {
    await executeProjectScan(resolvedRoot);
    store = SeoDatabase.open(resolvedRoot);
    project = new ProjectRepository(store).getLatestProject();
    store.close();
  }

  if (!project) {
    throw new Error('Could not initialize project index for audit');
  }

  store = SeoDatabase.open(resolvedRoot);
  try {
    const projectRepo = new ProjectRepository(store);
    const routeRepo = new RouteRepository(store);
    const crawlRepo = new CrawlRepository(store);
    const findingRepo = new FindingRepository(store);

    const files = projectRepo.listProjectFiles(project.id);
    const sitemapFile = files.find((f) => f.kind === 'sitemap')?.path ?? null;
    const robotsFile = files.find((f) => f.kind === 'robots')?.path ?? null;
    let robotsTxtContent: string | null = null;
    if (robotsFile && robotsFile.endsWith('.txt')) {
      try {
        robotsTxtContent = fs.readFileSync(path.join(resolvedRoot, robotsFile), 'utf-8');
      } catch {
        robotsTxtContent = null;
      }
    }

    const routes = routeRepo.loadExtractedRoutes(project.id);
    const activeCrawlRun = crawlRunId
      ? crawlRepo.getCrawlRunById(crawlRunId)
      : crawlRepo.getLatestCompletedCrawlRun(project.id);
    const crawlPages = activeCrawlRun ? crawlRepo.getCrawlPages(activeCrawlRun.id) : [];

    const evaluatedFindings = runRulesEngine({
      project,
      routes,
      sitemapFilePath: sitemapFile,
      crawlPages,
      robotsTxtContent,
      robotsFilePath: robotsFile,
    });

    store.runInTransaction(() => {
      findingRepo.syncRulesCatalog(ALL_V02_RULES);
      findingRepo.syncFindingsAndActions(evaluatedFindings);
    });

    const allFindings = findingRepo.listFindings();
    const bySeverity: Record<SeverityLevel, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    let blockingIndexingCount = 0;
    for (const f of allFindings) {
      bySeverity[f.severity] += 1;
      if (f.blocksIndexing) blockingIndexingCount += 1;
    }

    return {
      projectId: project.id,
      crawlRunId: activeCrawlRun?.id ?? null,
      activeRulesCount: ALL_V02_RULES.length,
      totalFindings: allFindings.length,
      blockingIndexingCount,
      bySeverity,
    };
  } finally {
    store.close();
  }
}

export function createLocalApiApp(options: LocalApiAppOptions): LocalApiApp {
  const projectRoot = path.resolve(options.projectRoot);
  let activePort = options.port ?? 4321;
  const sessionToken = options.sessionToken ?? generateSessionToken();
  const defaultLang: SupportedLanguage = options.defaultLang ?? 'fr';

  function loadDashboardOverviewFromStore(store: SeoDatabase): DashboardOverview {
    const projectRepo = new ProjectRepository(store);
    const routeRepo = new RouteRepository(store);
    const findingRepo = new FindingRepository(store);
    const crawlRepo = new CrawlRepository(store);
    const decisionRepo = new DecisionRepository(store);

    const project = projectRepo.getLatestProject();
    const findings = findingRepo.listFindings();
    const decisions = decisionRepo.listDecisions();
    const bySeverity: Record<SeverityLevel, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    const byCategory: Record<RuleCategory, number> = {
      technical: 0,
      'on-page': 0,
      schema: 0,
      local: 0,
      geo: 0,
    };
    let blockingIndexingCount = 0;

    for (const f of findings) {
      bySeverity[f.severity] += 1;
      byCategory[f.category] += 1;
      if (f.blocksIndexing) blockingIndexingCount += 1;
    }

    const latestCrawlRun = project
      ? crawlRepo.getLatestCompletedCrawlRun(project.id)
      : null;
    const filesScanned = project ? projectRepo.listProjectFiles(project.id).length : 0;
    const routesCount = project ? routeRepo.countProjectRoutes(project.id) : 0;

    return {
      project,
      stats: {
        filesScanned,
        routesCount,
        totalFindings: findings.length,
        blockingIndexingCount,
        bySeverity,
        byCategory,
        decisionsCount: decisions.length,
      },
      latestCrawlRun,
    };
  }

  function jsonResponse(
    status: number,
    payload: unknown,
    originHeader: string | null,
    extraHeaders?: Record<string, string>,
  ): Response {
    const headers: Record<string, string> = {
      'Content-Type':
        status >= 400 ? 'application/problem+json; charset=utf-8' : 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...buildCorsHeaders(originHeader, activePort),
      ...(extraHeaders ?? {}),
    };
    return new Response(JSON.stringify(payload), { status, headers });
  }

  async function handleRequest(input: string | Request, init?: RequestInit): Promise<Response> {
    const req =
      typeof input === 'string'
        ? new Request(
            input.startsWith('http://') || input.startsWith('https://')
              ? input
              : `http://127.0.0.1:${activePort}${input.startsWith('/') ? input : `/${input}`}`,
            init,
          )
        : input;

    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method.toUpperCase();
    const hostHeader = req.headers.get('host');
    const originHeader = req.headers.get('origin');

    // 1. Validate Host and Origin headers against DNS rebinding / cross-origin attacks
    if (!isLoopbackHost(hostHeader, activePort)) {
      return jsonResponse(
        403,
        buildErrorEnvelope({
          typeSlug: 'forbidden-host',
          title: 'Forbidden Host Header',
          status: 403,
          detail: `Host '${hostHeader ?? ''}' is not allowed on loopback server 127.0.0.1:${activePort}.`,
          instance: pathname,
        }),
        null,
      );
    }

    if (!isAllowedLocalOrigin(originHeader, activePort)) {
      return jsonResponse(
        403,
        buildErrorEnvelope({
          typeSlug: 'forbidden-origin',
          title: 'Forbidden Origin Header',
          status: 403,
          detail: `Origin '${originHeader ?? ''}' is not permitted to access the local API.`,
          instance: pathname,
        }),
        null,
      );
    }

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(originHeader, activePort),
      });
    }

    // 2. Dashboard HTML entrypoint
    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const langParam = url.searchParams.get('lang');
      const resolvedLang: SupportedLanguage =
        langParam === 'en' || langParam === 'fr' ? langParam : defaultLang;
      const store = SeoDatabase.open(projectRoot);
      let html: string;
      try {
        const overview = loadDashboardOverviewFromStore(store);
        const routes = overview.project
          ? new RouteRepository(store).loadExtractedRoutes(overview.project.id)
          : [];
        const findings = new FindingRepository(store).listFindings();
        const backlog = new FindingRepository(store).listPrioritizedActions();
        const crawlPages = overview.latestCrawlRun
          ? new CrawlRepository(store).getCrawlPages(overview.latestCrawlRun.id)
          : [];
        const comparisonRows = compareCodeVsCrawl(routes, crawlPages);
        const decisions = new DecisionRepository(store).listDecisions();

        html = renderDashboardSpaHtml({
          lang: resolvedLang,
          overview,
          routes,
          findings,
          backlog,
          comparisonRows,
          decisions,
        });
      } finally {
        store.close();
      }
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': buildSessionSetCookieHeader(sessionToken),
          'Cache-Control': 'no-store',
          ...buildCorsHeaders(originHeader, activePort),
        },
      });
    }

    // 3. Require valid HttpOnly session cookie (or X-Seo-Partner-Session header) on all POST endpoints
    if (method === 'POST' && pathname.startsWith('/api/v1/')) {
      const validSession = verifySessionRequest(
        {
          cookie: req.headers.get('cookie'),
          sessionTokenHeader: req.headers.get('x-seo-partner-session'),
        },
        sessionToken,
      );
      if (!validSession) {
        return jsonResponse(
          401,
          buildErrorEnvelope({
            typeSlug: 'unauthorized-session',
            title: 'Unauthorized Local Session',
            status: 401,
            detail:
              'Missing or invalid HttpOnly session cookie (seo_partner_session). Load / or /api/v1/session first.',
            instance: pathname,
          }),
          originHeader,
        );
      }
    }

    // 4. Route /api/v1/* endpoints
    try {
      if (method === 'GET' && pathname === '/api/v1/health') {
        return jsonResponse(
          200,
          buildSuccessEnvelope({
            status: 'ok',
            version: '0.3.0',
            host: '127.0.0.1',
            port: activePort,
          }),
          originHeader,
        );
      }

      if (method === 'GET' && pathname === '/api/v1/session') {
        return jsonResponse(
          200,
          buildSuccessEnvelope({
            authenticated: true,
            host: '127.0.0.1',
            port: activePort,
          }),
          originHeader,
          {
            'Set-Cookie': buildSessionSetCookieHeader(sessionToken),
          },
        );
      }

      if (method === 'GET' && pathname === '/api/v1/openapi.json') {
        return jsonResponse(
          200,
          buildSuccessEnvelope(buildOpenApiSpec({ port: activePort })),
          originHeader,
        );
      }

      if (method === 'GET' && pathname === '/api/v1/overview') {
        const store = SeoDatabase.open(projectRoot);
        try {
          const overview = loadDashboardOverviewFromStore(store);
          return jsonResponse(200, buildSuccessEnvelope(overview), originHeader);
        } finally {
          store.close();
        }
      }

      if (method === 'GET' && pathname === '/api/v1/routes') {
        const store = SeoDatabase.open(projectRoot);
        try {
          const project = new ProjectRepository(store).getLatestProject();
          if (!project) {
            return jsonResponse(
              200,
              buildSuccessEnvelope({ total: 0, items: [] }),
              originHeader,
            );
          }
          const routes = new RouteRepository(store).loadExtractedRoutes(project.id);
          const items = routes.map((r) => {
            const firstH1 = r.headings.find((h) => h.level === 1);
            return {
              id: r.route.id ?? 0,
              pattern: r.route.pattern,
              filePath: r.route.filePath,
              routerKind: r.route.routerKind,
              renderingMode: r.route.renderingMode,
              isPrivate: r.route.isPrivate,
              inSitemap: r.route.inSitemap,
              title: r.title?.value ?? null,
              titleLine: r.title?.line ?? null,
              description: r.description?.value ?? null,
              descriptionLine: r.description?.line ?? null,
              canonical: r.canonical?.value ?? null,
              robots: r.robots?.value ?? null,
              h1Count: r.headings.filter((h) => h.level === 1).length,
              h1FirstText: firstH1?.text ?? null,
              h1Line: firstH1?.line ?? null,
              htmlLang: r.htmlLang?.value ?? null,
            };
          });
          return jsonResponse(
            200,
            buildSuccessEnvelope({ total: items.length, items }),
            originHeader,
          );
        } finally {
          store.close();
        }
      }

      if (method === 'GET' && pathname === '/api/v1/search') {
        const parsedQuery = SearchQuerySchema.safeParse({
          q: url.searchParams.get('q') ?? undefined,
          limit: url.searchParams.get('limit') ?? undefined,
        });
        if (!parsedQuery.success) {
          return jsonResponse(
            422,
            buildErrorEnvelope({
              typeSlug: 'validation-error',
              title: 'Invalid Search Query Parameters',
              status: 422,
              detail: parsedQuery.error,
              instance: pathname,
            }),
            originHeader,
          );
        }

        const startSearch = Date.now();
        const store = SeoDatabase.open(projectRoot);
        try {
          const project = new ProjectRepository(store).getLatestProject();
          const results = project
            ? new RouteRepository(store).searchFts(
                project.id,
                parsedQuery.data.q,
                parsedQuery.data.limit ?? 20,
              )
            : [];
          return jsonResponse(
            200,
            buildSuccessEnvelope({
              query: parsedQuery.data.q,
              durationMs: Date.now() - startSearch,
              results,
            }),
            originHeader,
          );
        } finally {
          store.close();
        }
      }

      if (method === 'GET' && pathname === '/api/v1/findings') {
        const parsedQuery = FindingsQuerySchema.safeParse({
          category: url.searchParams.get('category') ?? undefined,
          severity: url.searchParams.get('severity') ?? undefined,
          blocksIndexing: url.searchParams.get('blocksIndexing') ?? undefined,
          ruleId: url.searchParams.get('ruleId') ?? undefined,
          routePattern: url.searchParams.get('routePattern') ?? undefined,
        });
        if (!parsedQuery.success) {
          return jsonResponse(
            422,
            buildErrorEnvelope({
              typeSlug: 'validation-error',
              title: 'Invalid Findings Query Parameters',
              status: 422,
              detail: parsedQuery.error,
              instance: pathname,
            }),
            originHeader,
          );
        }

        const store = SeoDatabase.open(projectRoot);
        try {
          let items: ReadonlyArray<Finding> = new FindingRepository(store).listFindings({
            category: parsedQuery.data.category,
            severity: parsedQuery.data.severity,
          });
          if (parsedQuery.data.blocksIndexing !== undefined) {
            items = items.filter((f) => f.blocksIndexing === parsedQuery.data.blocksIndexing);
          }
          if (parsedQuery.data.ruleId) {
            const ruleFilter = parsedQuery.data.ruleId.toUpperCase();
            items = items.filter((f) => f.ruleId.toUpperCase().includes(ruleFilter));
          }
          if (parsedQuery.data.routePattern) {
            items = items.filter((f) => f.subjectRef === parsedQuery.data.routePattern);
          }
          return jsonResponse(
            200,
            buildSuccessEnvelope({ total: items.length, items }),
            originHeader,
          );
        } finally {
          store.close();
        }
      }

      if (method === 'GET' && pathname === '/api/v1/backlog') {
        const parsedQuery = BacklogQuerySchema.safeParse({
          ownerRole: url.searchParams.get('ownerRole') ?? undefined,
          targetTimeframe: url.searchParams.get('targetTimeframe') ?? undefined,
        });
        if (!parsedQuery.success) {
          return jsonResponse(
            422,
            buildErrorEnvelope({
              typeSlug: 'validation-error',
              title: 'Invalid Backlog Query Parameters',
              status: 422,
              detail: parsedQuery.error,
              instance: pathname,
            }),
            originHeader,
          );
        }

        const store = SeoDatabase.open(projectRoot);
        try {
          let items = new FindingRepository(store).listPrioritizedActions();
          if (parsedQuery.data.ownerRole) {
            items = items.filter((a) => a.ownerRole === parsedQuery.data.ownerRole);
          }
          if (parsedQuery.data.targetTimeframe) {
            items = items.filter((a) => a.targetTimeframe === parsedQuery.data.targetTimeframe);
          }
          return jsonResponse(
            200,
            buildSuccessEnvelope({ total: items.length, items }),
            originHeader,
          );
        } finally {
          store.close();
        }
      }

      if (method === 'GET' && pathname === '/api/v1/crawls') {
        const store = SeoDatabase.open(projectRoot);
        try {
          const project = new ProjectRepository(store).getLatestProject();
          const items = project ? new CrawlRepository(store).listCrawlRuns(project.id) : [];
          return jsonResponse(
            200,
            buildSuccessEnvelope({ total: items.length, items }),
            originHeader,
          );
        } finally {
          store.close();
        }
      }

      if (method === 'POST' && pathname === '/api/v1/crawls') {
        const rawBody = await req.json().catch(() => ({}));
        const parsedBody = CrawlRequestSchema.safeParse(rawBody);
        if (!parsedBody.success) {
          return jsonResponse(
            422,
            buildErrorEnvelope({
              typeSlug: 'validation-error',
              title: 'Invalid Crawl Request Body',
              status: 422,
              detail: parsedBody.error,
              instance: pathname,
            }),
            originHeader,
          );
        }

        const config = loadSeoConfig(projectRoot);
        const projectId = computeProjectId(projectRoot);
        const projectName = config?.projectName ?? (path.basename(projectRoot) || 'seo-project');

        const store = SeoDatabase.open(projectRoot);
        let crawlRun;
        let pages;
        try {
          const projectRepo = new ProjectRepository(store);
          if (!projectRepo.getProject(projectId)) {
            const now = new Date().toISOString();
            projectRepo.upsertProject({
              id: projectId,
              rootPath: projectRoot,
              name: projectName,
              frameworks: [],
              hasRobotsTxt: false,
              hasSitemap: false,
              createdAt: config?.createdAt ?? now,
              lastScannedAt: null,
            });
          }

          try {
            const res = await runHttpCrawler({
              projectRoot,
              projectId,
              startUrl: parsedBody.data.startUrl,
              store,
              allowLocal: parsedBody.data.allowLocal ?? false,
              maxPages: parsedBody.data.maxPages ?? 50,
              maxDepth: parsedBody.data.maxDepth ?? 3,
              dnsLookup: options.customDnsLookup,
            });
            crawlRun = new CrawlRepository(store).getCrawlRunById(res.crawlRunId);
            pages = res.pages;
          } catch (crawlErr) {
            const msg = crawlErr instanceof Error ? crawlErr.message : String(crawlErr);
            if (/SSRF|loopback|private|forbidden|blocked/i.test(msg)) {
              return jsonResponse(
                403,
                buildErrorEnvelope({
                  typeSlug: 'ssrf-blocked',
                  title: 'Blocked by Anti-SSRF Guard',
                  status: 403,
                  detail: msg,
                  instance: pathname,
                }),
                originHeader,
              );
            }
            throw crawlErr;
          }
        } finally {
          store.close();
        }

        if (crawlRun) {
          await executeProjectAudit(projectRoot, crawlRun.id);
        }

        return jsonResponse(
          200,
          buildSuccessEnvelope({
            crawlRun,
            pagesCount: pages.length,
          }),
          originHeader,
        );
      }

      if (method === 'GET' && pathname === '/api/v1/crawls/latest/compare') {
        const store = SeoDatabase.open(projectRoot);
        try {
          const project = new ProjectRepository(store).getLatestProject();
          if (!project) {
            return jsonResponse(
              200,
              buildSuccessEnvelope({
                crawlRun: null,
                totalRows: 0,
                divergentRowsCount: 0,
                rows: [],
              }),
              originHeader,
            );
          }
          const routes = new RouteRepository(store).loadExtractedRoutes(project.id);
          const crawlRepo = new CrawlRepository(store);
          const latestCrawl = crawlRepo.getLatestCompletedCrawlRun(project.id);
          const crawlPages = latestCrawl ? crawlRepo.getCrawlPages(latestCrawl.id) : [];

          const rows = compareCodeVsCrawl(routes, crawlPages);
          const divergentRowsCount = rows.filter((r) => r.divergences.length > 0).length;

          return jsonResponse(
            200,
            buildSuccessEnvelope({
              crawlRun: latestCrawl,
              totalRows: rows.length,
              divergentRowsCount,
              rows,
            }),
            originHeader,
          );
        } finally {
          store.close();
        }
      }

      if (method === 'POST' && pathname === '/api/v1/scan') {
        const rawBody = await req.json().catch(() => ({}));
        const parsedBody = ScanRequestSchema.safeParse(rawBody);
        if (!parsedBody.success) {
          return jsonResponse(
            422,
            buildErrorEnvelope({
              typeSlug: 'validation-error',
              title: 'Invalid Scan Request Body',
              status: 422,
              detail: parsedBody.error,
              instance: pathname,
            }),
            originHeader,
          );
        }

        const scanResult = await executeProjectScan(projectRoot, {
          rebuild: parsedBody.data.rebuild,
          scopeDir: parsedBody.data.scopeDir,
        });
        const auditResult = await executeProjectAudit(projectRoot);

        return jsonResponse(
          200,
          buildSuccessEnvelope({
            ...scanResult,
            totalFindings: auditResult.totalFindings,
            blockingIndexingCount: auditResult.blockingIndexingCount,
          }),
          originHeader,
        );
      }

      if (method === 'POST' && pathname === '/api/v1/audit') {
        const rawBody = await req.json().catch(() => ({}));
        const parsedBody = AuditRequestSchema.safeParse(rawBody);
        if (!parsedBody.success) {
          return jsonResponse(
            422,
            buildErrorEnvelope({
              typeSlug: 'validation-error',
              title: 'Invalid Audit Request Body',
              status: 422,
              detail: parsedBody.error,
              instance: pathname,
            }),
            originHeader,
          );
        }

        const auditResult = await executeProjectAudit(
          projectRoot,
          parsedBody.data.crawlRunId,
        );
        return jsonResponse(200, buildSuccessEnvelope(auditResult), originHeader);
      }

      if (method === 'GET' && pathname === '/api/v1/decisions') {
        const store = SeoDatabase.open(projectRoot);
        try {
          const items = new DecisionRepository(store).listDecisions();
          return jsonResponse(
            200,
            buildSuccessEnvelope({ total: items.length, items }),
            originHeader,
          );
        } finally {
          store.close();
        }
      }

      if (method === 'POST' && pathname === '/api/v1/decisions') {
        const rawBody = await req.json().catch(() => ({}));
        const parsedBody = CreateDecisionRequestSchema.safeParse(rawBody);
        if (!parsedBody.success) {
          return jsonResponse(
            422,
            buildErrorEnvelope({
              typeSlug: 'validation-error',
              title: 'Invalid Decision Payload',
              status: 422,
              detail: parsedBody.error,
              instance: pathname,
            }),
            originHeader,
          );
        }

        const today = new Date().toISOString().slice(0, 10);
        const store = SeoDatabase.open(projectRoot);
        let created: DecisionRecord;
        try {
          created = new DecisionRepository(store).addDecision({
            date: today,
            title: parsedBody.data.title,
            rationale: parsedBody.data.rationale,
            findingId: parsedBody.data.findingId ?? null,
          });
        } finally {
          store.close();
        }

        appendDecisionToFile(projectRoot, created);

        return jsonResponse(200, buildSuccessEnvelope(created), originHeader);
      }

      if (method === 'POST' && pathname === '/api/v1/reports') {
        const rawBody = await req.json().catch(() => ({}));
        const parsedBody = CreateReportRequestSchema.safeParse(rawBody);
        if (!parsedBody.success) {
          return jsonResponse(
            422,
            buildErrorEnvelope({
              typeSlug: 'validation-error',
              title: 'Invalid Report Request Body',
              status: 422,
              detail: parsedBody.error,
              instance: pathname,
            }),
            originHeader,
          );
        }

        const format: ReportFormat = parsedBody.data.format ?? 'html';
        const reportType: ReportType = parsedBody.data.reportType ?? 'audit-complet';
        const lang: SupportedLanguage = parsedBody.data.lang ?? defaultLang;

        await executeProjectAudit(projectRoot);

        const store = SeoDatabase.open(projectRoot);
        try {
          const project = new ProjectRepository(store).getLatestProject();
          if (!project) {
            throw new Error('Project index not initialized');
          }
          const findingRepo = new FindingRepository(store);
          const crawlRepo = new CrawlRepository(store);
          const findings = findingRepo.listFindings({
            category: reportType === 'audit-technique' ? 'technical' : undefined,
          });
          const actions = findingRepo.listPrioritizedActions();
          const crawlRun = crawlRepo.getLatestCompletedCrawlRun(project.id);

          let filePath: string;
          let content: string;

          if (format === 'html') {
            const written = writeHtmlReport({
              projectRoot,
              project,
              findings,
              actions,
              lang,
              reportType,
              crawlRun,
            });
            filePath = written.filePath;
            content = written.html;
          } else if (format === 'json') {
            const today = new Date().toISOString().slice(0, 10);
            filePath = path.resolve(projectRoot, 'docs', 'seo', `${today}-${reportType}.json`);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            content = JSON.stringify(
              {
                project,
                reportType,
                lang,
                generatedAt: new Date().toISOString(),
                crawlRun: crawlRun ?? null,
                findings,
                actions,
              },
              null,
              2,
            );
            fs.writeFileSync(filePath, content, 'utf-8');
          } else {
            const written = writeMarkdownReport({
              projectRoot,
              project,
              findings,
              actions,
              lang,
              reportType,
              crawlRun,
            });
            filePath = written.filePath;
            content = written.markdown;
          }

          return jsonResponse(
            200,
            buildSuccessEnvelope({
              reportType,
              format,
              lang,
              filePath,
              content,
              totalFindings: findings.length,
              blockingIndexingCount: findings.filter((f) => f.blocksIndexing).length,
            }),
            originHeader,
          );
        } finally {
          store.close();
        }
      }

      return jsonResponse(
        404,
        buildErrorEnvelope({
          typeSlug: 'not-found',
          title: 'Resource Not Found',
          status: 404,
          detail: `Endpoint '${method} ${pathname}' does not exist on /api/v1.`,
          instance: pathname,
        }),
        originHeader,
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return jsonResponse(
        500,
        buildErrorEnvelope({
          typeSlug: 'internal-error',
          title: 'Internal Server Error',
          status: 500,
          detail,
          instance: pathname,
        }),
        originHeader,
      );
    }
  }

  return {
    request: handleRequest,
    getSessionToken: () => sessionToken,
    getPort: () => activePort,
    setPort: (nextPort: number) => {
      activePort = nextPort;
    },
  };
}

function tryListenOnLoopback(server: http.Server, port: number): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException): void => {
      server.removeListener('listening', onListening);
      reject(err);
    };
    const onListening = (): void => {
      server.removeListener('error', onError);
      const addr = server.address() as AddressInfo | null;
      resolve(addr?.port ?? port);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

export async function startLocalServer(
  options: StartLocalServerOptions,
): Promise<RunningLocalServer> {
  const requestedPort = options.port ?? 4321;
  const maxRetries = options.maxPortRetries ?? 20;
  const app = createLocalApiApp({
    ...options,
    port: requestedPort,
  });

  const createHttpServerInstance = (): http.Server =>
    http.createServer(async (req, res) => {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const bodyBuffer = Buffer.concat(chunks);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (Array.isArray(v)) {
            headers.set(k, v.join(', '));
          } else if (typeof v === 'string') {
            headers.set(k, v);
          }
        }
        const method = req.method ?? 'GET';
        const fullUrl = `http://127.0.0.1:${app.getPort()}${req.url ?? '/'}`;
        const webReq = new Request(fullUrl, {
          method,
          headers,
          body:
            method !== 'GET' && method !== 'HEAD' && bodyBuffer.length > 0
              ? bodyBuffer
              : undefined,
        });

        const webRes = await app.request(webReq);
        res.statusCode = webRes.status;
        webRes.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        const responseText = await webRes.text();
        res.end(responseText);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
        res.end(
          JSON.stringify(
            buildErrorEnvelope({
              typeSlug: 'internal-error',
              title: 'Internal Server Error',
              status: 500,
              detail: err instanceof Error ? err.message : String(err),
              instance: req.url ?? '/',
            }),
          ),
        );
      }
    });

  let activeServer = createHttpServerInstance();
  let boundPort = requestedPort;
  let listened = false;

  const candidateCount = requestedPort === 0 ? 1 : maxRetries + 1;
  for (let offset = 0; offset < candidateCount; offset += 1) {
    const candidatePort = requestedPort === 0 ? 0 : requestedPort + offset;
    try {
      boundPort = await tryListenOnLoopback(activeServer, candidatePort);
      listened = true;
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (
        (code === 'EADDRINUSE' || code === 'EACCES') &&
        requestedPort !== 0 &&
        offset < candidateCount - 1
      ) {
        activeServer = createHttpServerInstance();
        continue;
      }
      if ((code === 'EADDRINUSE' || code === 'EACCES') && requestedPort !== 0) {
        activeServer = createHttpServerInstance();
        boundPort = await tryListenOnLoopback(activeServer, 0);
        listened = true;
        break;
      }
      throw err;
    }
  }

  if (!listened) {
    throw new Error(
      `Unable to bind local server on 127.0.0.1 between ports ${requestedPort} and ${requestedPort + maxRetries}`,
    );
  }

  app.setPort(boundPort);
  const fallbackUsed = requestedPort !== 0 && boundPort !== requestedPort;
  const url = `http://127.0.0.1:${boundPort}`;

  return {
    app,
    server: activeServer,
    host: '127.0.0.1',
    requestedPort: requestedPort === 0 ? boundPort : requestedPort,
    port: boundPort,
    fallbackUsed,
    url,
    close: () =>
      new Promise<void>((resolve, reject) => {
        activeServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}
