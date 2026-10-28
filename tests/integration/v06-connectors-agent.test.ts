import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeCli } from 'seo-partner';
import { McpServer } from '@seo-partner/mcp';
import { createLocalApiApp } from '@seo-partner/server';
import { SeoDatabase, GscRepository, CwvRepository } from '@seo-partner/store';
import { AutonomousAgent, type LlmProviderAdapter, type LlmCompletionRequest, type LlmCompletionResponse } from '@seo-partner/agent';

describe('E2E Integration Workflow v0.6 — GSC, Core Web Vitals & Autonomous Agent Loop', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-v06-e2e-'));
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.seo'), { recursive: true });

    // Seed sample web page
    fs.writeFileSync(
      path.join(tmpDir, 'pages', 'index.html'),
      '<!DOCTYPE html><html><head><title>Accueil Test</title></head><body><h1>Bienvenue</h1></body></html>',
      'utf-8',
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Windows file lock cleanup best effort
    }
  });

  it('completes the full end-to-end v0.6 lifecycle: GSC, CWV audit, autonomous agent, MCP & REST API', async () => {
    // 1. Initialize project and run initial scan via CLI
    const initRes = await executeCli(['init', '--cwd', tmpDir, '--here', '--lang', 'fr', '--json']);
    expect(initRes.exitCode).toBe(0);

    const scanRes = await executeCli(['scan', '--cwd', tmpDir, '--json']);
    expect(scanRes.exitCode).toBe(0);

    // 2. Seed GSC performance and inspection data in SQLite store
    const store = SeoDatabase.open(tmpDir);
    const project = store.db.prepare('SELECT id FROM project LIMIT 1').get() as { id: string };
    expect(project).toBeDefined();

    const gscRepo = new GscRepository(store);
    gscRepo.savePerformanceRows([
      {
        id: crypto.randomUUID(),
        projectId: project.id,
        url: 'https://example.com/accueil',
        query: 'seo local',
        device: 'mobile',
        country: 'fra',
        clicks: 142,
        impressions: 1200,
        ctr: 0.118,
        position: 3.4,
        dateStart: '2026-10-01',
        dateEnd: '2026-10-28',
        fetchedAt: '2026-10-28T12:00:00Z',
      },
    ]);

    gscRepo.saveInspectionRecord({
      id: crypto.randomUUID(),
      projectId: project.id,
      url: 'https://example.com/accueil',
      verdict: 'PASS',
      coverageState: 'Submitted and indexed',
      indexingState: 'INDEXING_ALLOWED',
      robotsTxtState: 'ALLOWED',
      lastCrawlTime: '2026-10-25T14:00:00Z',
      pageFetchState: 'SUCCESSFUL',
      canonicalUser: 'https://example.com/accueil',
      canonicalGoogle: 'https://example.com/accueil',
      fetchedAt: '2026-10-25T14:30:00Z',
    });

    // 3. Seed Core Web Vitals metric record with poor LCP and CLS
    const cwvRepo = new CwvRepository(store);
    cwvRepo.saveMetrics([
      {
        id: crypto.randomUUID(),
        projectId: project.id,
        url: 'https://example.com/accueil',
        formFactor: 'PHONE',
        scope: 'url',
        lcpMs: 4200,
        lcpRating: 'poor',
        inpMs: 140,
        inpRating: 'good',
        clsScore: 0.28,
        clsRating: 'poor',
        fcpMs: 2100,
        fcpRating: 'needs-improvement',
        ttfbMs: 1200,
        ttfbRating: 'needs-improvement',
        fetchedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
      },
    ]);
    store.close();

    // 4. Run CLI audit with Core Web Vitals (--with-cwv)
    const auditRes = await executeCli([
      'audit',
      '--cwd',
      tmpDir,
      '--with-cwv',
      '--category',
      'performance',
      '--json',
    ]);
    expect(auditRes.exitCode).toBe(0);
    const auditEnvelope = JSON.parse(auditRes.stdout);
    expect(auditEnvelope.success).toBe(true);
    expect(auditEnvelope.data.totalFindings).toBeGreaterThanOrEqual(2); // LCP and CLS flagged

    const findingRuleIds = auditEnvelope.data.findings.map((f: any) => f.ruleId);
    expect(findingRuleIds).toContain('R-PERF-01'); // LCP rule
    expect(findingRuleIds).toContain('R-PERF-03'); // CLS rule

    // 5. Test MCP Server exposing all new tools
    const mcp = new McpServer({ projectRoot: tmpDir, allowApply: false, lang: 'fr' });
    await mcp.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }));
    const listRaw = await mcp.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    const listRes = JSON.parse(listRaw!);
    const toolNames = listRes.result.tools.map((t: any) => t.name);

    expect(toolNames).toContain('get_gsc_performance');
    expect(toolNames).toContain('inspect_gsc_url');
    expect(toolNames).toContain('get_cwv_metrics');
    expect(toolNames).toContain('run_agent_step');

    // 6. Test Autonomous Agent ReAct execution loop
    let agentCalls = 0;
    const mockLlm: LlmProviderAdapter = {
      provider: 'custom',
      async complete(_req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
        agentCalls += 1;
        if (agentCalls === 1) {
          return {
            content: 'Je consulte les métriques CWV.',
            toolCalls: [
              {
                id: 'call_cwv',
                name: 'get_cwv_metrics',
                arguments: { url: 'https://example.com/accueil' },
              },
            ],
            stopReason: 'tool_use',
          };
        }
        return {
          content: 'Diagnostic terminé. Recommandation: précharger l image hero LCP.',
          stopReason: 'end_turn',
        };
      },
    };

    const agent = new AutonomousAgent();
    const agentResult = await agent.run({
      projectRoot: tmpDir,
      goal: 'Optimiser LCP',
      adapter: mockLlm,
      maxIterations: 5,
    });

    expect(agentResult.session.status).toBe('completed');
    expect(agentResult.session.iterationsCompleted).toBe(2);
    expect(agentResult.steps).toHaveLength(1);
    expect(agentResult.steps[0]?.toolName).toBe('get_cwv_metrics');

    // Verify session log file written under .seo/logs/agent-<sessionId>.jsonl
    const logPath = path.join(tmpDir, '.seo', 'logs', `agent-${agentResult.session.id}.jsonl`);
    expect(fs.existsSync(logPath)).toBe(true);

    // 7. Test Local REST API endpoints /api/v1/gsc and /api/v1/cwv
    const app = createLocalApiApp({ projectRoot: tmpDir, defaultLang: 'fr' });

    // GET /api/v1/gsc
    const gscReq = new Request('http://127.0.0.1:4321/api/v1/gsc', {
      headers: { host: '127.0.0.1:4321' },
    });
    const gscHttpRes = await app.request(gscReq);
    expect(gscHttpRes.status).toBe(200);
    const gscData = (await gscHttpRes.json()) as any;
    expect(gscData.success).toBe(true);
    expect(gscData.data.recordsCount).toBe(1);
    expect(gscData.data.records[0].query).toBe('seo local');

    // GET /api/v1/cwv
    const cwvReq = new Request('http://127.0.0.1:4321/api/v1/cwv', {
      headers: { host: '127.0.0.1:4321' },
    });
    const cwvHttpRes = await app.request(cwvReq);
    expect(cwvHttpRes.status).toBe(200);
    const cwvData = (await cwvHttpRes.json()) as any;
    expect(cwvData.success).toBe(true);
    expect(cwvData.data.metricsCount).toBe(1);
    expect(cwvData.data.metrics[0].lcpMs).toBe(4200);
    expect(cwvData.data.metrics[0].lcpRating).toBe('poor');
  });
});
