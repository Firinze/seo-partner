import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SeoDatabase, BingRepository, ProjectRepository } from '@seo-partner/store';
import {
  runBingSyncCommand,
  runBingInspectCommand,
  getBingPerformanceSummary,
  getBingPerformanceTool,
  inspectBingUrlTool,
} from '@seo-partner/tools';
import { executeCli } from '../../packages/cli/src/index.js';

describe('Bing Webmaster Tools Connector & 7-Day TTL Cache (Integration)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-bing-test-'));
    fs.mkdirSync(path.join(tmpDir, '.seo'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.seo', 'config.json'),
      JSON.stringify({
        version: '1.0',
        projectName: 'bing-test',
        lang: 'fr',
        ideTargets: [],
        maxFileSizeKb: 500,
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(tmpDir, '.seo', 'credentials-bing.json'),
      JSON.stringify({ apiKey: 'mock-bing-api-key' }),
      'utf-8',
    );

    const store = SeoDatabase.open(tmpDir);
    new ProjectRepository(store).upsertProject({
      id: 'proj_default',
      rootPath: tmpDir,
      name: 'bing-test',
      frameworks: [],
      hasRobotsTxt: false,
      hasSitemap: false,
      createdAt: new Date().toISOString(),
      lastScannedAt: new Date().toISOString(),
    });
    store.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should seed cache, verify TTL 7 days and retrieve via CLI and summary', async () => {
    const store = SeoDatabase.open(tmpDir);
    const bingRepo = new BingRepository(store);

    const now = new Date();
    const fetchedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

    bingRepo.savePerformanceRows([
      {
        id: 'perf-1',
        projectId: 'proj_default',
        url: 'https://example.com',
        query: 'nextjs seo generator',
        clicks: 45,
        impressions: 900,
        ctr: 0.05,
        position: 3.1,
        dateStart: '2026-09-29',
        dateEnd: '2026-10-29',
        fetchedAt,
        expiresAt,
      },
      {
        id: 'perf-2',
        projectId: 'proj_default',
        url: 'https://example.com',
        query: 'technical seo audit',
        clicks: 30,
        impressions: 500,
        ctr: 0.06,
        position: 2.4,
        dateStart: '2026-09-29',
        dateEnd: '2026-10-29',
        fetchedAt,
        expiresAt,
      },
    ]);

    bingRepo.saveInspection({
      id: 'inspect-1',
      projectId: 'proj_default',
      url: 'https://example.com/page-1',
      verdict: 'INDEXED',
      indexingState: 'INDEXED',
      crawlState: 'CRAWLED_SUCCESSFULLY',
      lastCrawlTime: fetchedAt,
      httpCode: 200,
      fetchedAt,
      expiresAt,
    });

    const isCached = bingRepo.isPerformanceCached('proj_default');
    expect(isCached).toBe(true);
    store.close();

    // 1. Verify getBingPerformanceSummary reads from SQLite cache
    const summary = await getBingPerformanceSummary({ projectRoot: tmpDir });
    expect(summary.totalClicks).toBe(75);
    expect(summary.totalImpressions).toBe(1400);
    expect(summary.averagePosition).toBeCloseTo(2.75, 2);

    // 2. Verify CLI bing inspect with --json
    const cliInspectRes = await executeCli([
      'bing',
      'inspect',
      '--url',
      'https://example.com/page-1',
      '--cwd',
      tmpDir,
      '--json',
    ]);
    expect(cliInspectRes.exitCode).toBe(0);
    const parsedInspect = JSON.parse(cliInspectRes.stdout);
    expect(parsedInspect.success).toBe(true);
    expect(parsedInspect.data.verdict).toBe('INDEXED');
    expect(parsedInspect.data.httpCode).toBe(200);

    // 3. Verify CLI bing sync reads from cache without network calls
    const cliSyncRes = await executeCli([
      'bing',
      'sync',
      '--site',
      'https://example.com',
      '--cwd',
      tmpDir,
      '--json',
    ]);
    expect(cliSyncRes.exitCode).toBe(0);
    const parsedSync = JSON.parse(cliSyncRes.stdout);
    expect(parsedSync.success).toBe(true);
    expect(parsedSync.data.fromCache).toBe(true);
    expect(parsedSync.data.rowsSynced).toBe(2);
  });

  it('should execute MCP tools get_bing_performance and inspect_bing_url', async () => {
    const store = SeoDatabase.open(tmpDir);
    const bingRepo = new BingRepository(store);
    const now = new Date();
    const fetchedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

    bingRepo.savePerformanceRows([
      {
        id: 'perf-mcp',
        projectId: 'proj_default',
        url: 'https://example.com',
        query: 'mcp bing test',
        clicks: 10,
        impressions: 100,
        ctr: 0.1,
        position: 1.0,
        dateStart: '2026-09-29',
        dateEnd: '2026-10-29',
        fetchedAt,
        expiresAt,
      },
    ]);

    bingRepo.saveInspection({
      id: 'inspect-mcp',
      projectId: 'proj_default',
      url: 'https://example.com/mcp',
      verdict: 'INDEXED',
      indexingState: 'INDEXED',
      crawlState: 'CRAWLED_SUCCESSFULLY',
      lastCrawlTime: fetchedAt,
      httpCode: 200,
      fetchedAt,
      expiresAt,
    });
    store.close();

    const mcpCtx = {
      projectRoot: tmpDir,
      allowApply: true,
      lang: 'fr' as const,
    };

    const perfToolResult = await getBingPerformanceTool.execute(mcpCtx, {
      siteUrl: 'https://example.com',
    });
    expect(perfToolResult.ok).toBe(true);
    expect(perfToolResult.summary).toContain('Performance Bing');
    expect(perfToolResult.summary).toContain('10 clics');

    const inspectToolResult = await inspectBingUrlTool.execute(mcpCtx, {
      url: 'https://example.com/mcp',
    });
    expect(inspectToolResult.ok).toBe(true);
    expect(inspectToolResult.summary).toContain('INDEXED');
    expect(inspectToolResult.summary).toContain('200');
  });
});
