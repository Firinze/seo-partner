export interface OpenApiSpecOptions {
  readonly port: number;
}

export function buildOpenApiSpec(options: OpenApiSpecOptions): Record<string, unknown> {
  const baseUrl = `http://127.0.0.1:${options.port}`;
  return {
    openapi: '3.1.0',
    info: {
      title: 'seo-partner Local REST API',
      version: '0.4.0',
      description:
        'Deterministic Local-First SEO API with RFC 9457 Problem Details, Host/Origin loopback protection, and HttpOnly session authentication.',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Local Loopback Server (127.0.0.1 only)',
      },
    ],
    components: {
      securitySchemes: {
        SessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'seo_partner_session',
        },
      },
      schemas: {
        ProblemDetails: {
          type: 'object',
          required: ['type', 'title', 'status', 'detail', 'instance'],
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'integer' },
            detail: { type: 'string' },
            instance: { type: 'string' },
          },
        },
        ApiEnvelope: {
          type: 'object',
          required: ['success', 'data', 'error'],
          properties: {
            success: { type: 'boolean' },
            data: {},
            error: { type: ['string', 'null'] },
          },
        },
      },
    },
    paths: {
      '/api/v1/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'Server is healthy' } },
        },
      },
      '/api/v1/session': {
        get: {
          summary: 'Initialize or verify local HttpOnly session cookie',
          responses: { '200': { description: 'Session initialized' } },
        },
      },
      '/api/v1/openapi.json': {
        get: {
          summary: 'OpenAPI 3.1.0 specification',
          responses: { '200': { description: 'OpenAPI 3.1 JSON document' } },
        },
      },
      '/api/v1/overview': {
        get: {
          summary: 'Aggregated project KPIs, severity/category counts, and latest crawl',
          responses: { '200': { description: 'DashboardOverview' } },
        },
      },
      '/api/v1/routes': {
        get: {
          summary: 'List extracted routes and metadata',
          responses: { '200': { description: 'Extracted routes' } },
        },
      },
      '/api/v1/search': {
        get: {
          summary: 'Full-text search across routes via SQLite FTS5 (< 100ms)',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
          ],
          responses: {
            '200': { description: 'FTS5 search hits' },
            '422': { description: 'Validation error (RFC 9457)' },
          },
        },
      },
      '/api/v1/findings': {
        get: {
          summary: 'Filterable list of SEO findings across 40 verified rules',
          responses: { '200': { description: 'Filtered findings' } },
        },
      },
      '/api/v1/backlog': {
        get: {
          summary: 'Prioritized ICE actions with indexing blockers (F-R3) always first',
          responses: { '200': { description: 'Prioritized backlog' } },
        },
      },
      '/api/v1/crawls': {
        get: {
          summary: 'List recorded HTTP crawl sessions',
          responses: { '200': { description: 'CrawlRun list' } },
        },
        post: {
          summary: 'Trigger a new anti-SSRF HTTP crawl and re-run 40 rules audit',
          security: [{ SessionCookie: [] }],
          responses: {
            '200': { description: 'Crawl completed' },
            '401': { description: 'Missing or invalid HttpOnly session' },
            '403': { description: 'Blocked by anti-SSRF guard' },
          },
        },
      },
      '/api/v1/crawls/latest/compare': {
        get: {
          summary: 'Side-by-side comparison between static source code and crawled HTTP pages',
          responses: { '200': { description: 'CodeVsCrawlComparisonRow list' } },
        },
      },
      '/api/v1/scan': {
        post: {
          summary: 'Trigger an incremental or full project scan',
          security: [{ SessionCookie: [] }],
          responses: { '200': { description: 'Scan completed' } },
        },
      },
      '/api/v1/audit': {
        post: {
          summary: 'Trigger the 40-rule SEO audit',
          security: [{ SessionCookie: [] }],
          responses: { '200': { description: 'Audit completed' } },
        },
      },
      '/api/v1/decisions': {
        get: {
          summary: 'List SEO architectural decisions',
          responses: { '200': { description: 'DecisionRecord list' } },
        },
        post: {
          summary: 'Record a new SEO architectural decision in SQLite and .seo/decisions.md',
          security: [{ SessionCookie: [] }],
          responses: { '200': { description: 'Decision created' } },
        },
      },
      '/api/v1/reports': {
        post: {
          summary: 'Generate and return a 5-section executive report (html, md, or json)',
          security: [{ SessionCookie: [] }],
          responses: { '200': { description: 'Report generated' } },
        },
      },
      '/api/v1/patches': {
        get: {
          summary: 'List proposed patch batches or retrieve a batch by batchId',
          parameters: [
            {
              name: 'batchId',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Optional batch ID to retrieve full patch details',
            },
          ],
          responses: {
            '200': { description: 'PatchBatchResult list or single batch' },
            '404': { description: 'Batch not found (RFC 9457)' },
          },
        },
        post: {
          summary: 'Propose unified diff patches for actionable findings (non-destructive propose-patch)',
          security: [{ SessionCookie: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    findingId: { type: 'string' },
                    ruleId: {
                      type: 'string',
                      enum: [
                        'R-TECH-01',
                        'R-TECH-02',
                        'R-TECH-03',
                        'R-TECH-05',
                        'R-TECH-14',
                        'R-ONPAGE-01',
                        'R-ONPAGE-04',
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Proposed patch batch created' },
            '401': { description: 'Authentication required' },
            '422': { description: 'Validation error or apply rejected via API' },
          },
        },
      },
    },
  };
}

