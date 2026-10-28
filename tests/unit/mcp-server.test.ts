import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { McpServer, runStdioServer } from '@seo-partner/mcp';
import {
  buildMcpConfigSnippets,
  writeMcpConfig,
} from '../../packages/cli/src/commands/mcp.js';
import { runInitCommand } from '../../packages/cli/src/commands/init.js';

describe('US1: Local MCP Stdio Server (@seo-partner/mcp) & Multi-IDE Config Integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-mcp-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('handles JSON-RPC protocol lifecycle: initialize handshake, notifications, ping, and uninitialized guard', async () => {
    const server = new McpServer({ projectRoot: tmpDir, lang: 'en' });

    // Calling tools before initialize should fail with -32600
    const prematureResRaw = await server.handleMessage(
      JSON.stringify({ jsonrpc: '2.0', id: 'pre-1', method: 'tools/list' }),
    );
    expect(prematureResRaw).not.toBeNull();
    const prematureRes = JSON.parse(prematureResRaw!);
    expect(prematureRes.error.code).toBe(-32600);
    expect(prematureRes.error.message).toContain('Server not initialized');

    // Ping before initialize is allowed
    const pingRaw = await server.handleMessage(
      JSON.stringify({ jsonrpc: '2.0', id: 'ping-1', method: 'ping' }),
    );
    const pingRes = JSON.parse(pingRaw!);
    expect(pingRes.result).toEqual({});

    // Initialize request
    const initRaw = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          clientInfo: { name: 'test-agent', version: '1.0' },
        },
      }),
    );
    const initRes = JSON.parse(initRaw!);
    expect(initRes.id).toBe(1);
    expect(initRes.result.protocolVersion).toBe('2025-06-18');
    expect(initRes.result.serverInfo.name).toBe('seo-partner');
    expect(initRes.result.serverInfo.version).toBe('0.4.0');
    expect(initRes.result.capabilities.tools.listChanged).toBe(false);

    // Initialized notification (no response)
    const notifRaw = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
    );
    expect(notifRaw).toBeNull();
  });

  it('handles JSON-RPC protocol error codes: parse error (-32700), invalid request (-32600), method not found (-32601), invalid params (-32602)', async () => {
    const server = new McpServer({ projectRoot: tmpDir });
    await server.handleMessage(
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    );

    // 1. Parse error
    const parseErrRaw = await server.handleMessage('{ invalid json string');
    const parseErr = JSON.parse(parseErrRaw!);
    expect(parseErr.id).toBeNull();
    expect(parseErr.error.code).toBe(-32700);

    // 2. Invalid Request (not an object or missing method)
    const invalidReqRaw = await server.handleMessage(
      JSON.stringify({ jsonrpc: '1.0', id: 2 }),
    );
    const invalidReq = JSON.parse(invalidReqRaw!);
    expect(invalidReq.error.code).toBe(-32600);

    // 3. Method not found
    const notFoundRaw = await server.handleMessage(
      JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'unknown_capability/run' }),
    );
    const notFound = JSON.parse(notFoundRaw!);
    expect(notFound.id).toBe(3);
    expect(notFound.error.code).toBe(-32601);

    // 4. Invalid params (unknown tool)
    const unknownToolRaw = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'non_existent_tool' },
      }),
    );
    const unknownTool = JSON.parse(unknownToolRaw!);
    expect(unknownTool.id).toBe(4);
    expect(unknownTool.error.code).toBe(-32602);
    expect(unknownTool.error.message).toContain("Tool not found");

    // 5. Invalid params (missing required arguments or invalid type)
    const invalidArgsRaw = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'search_fts', arguments: { query: '' } },
      }),
    );
    const invalidArgs = JSON.parse(invalidArgsRaw!);
    expect(invalidArgs.id).toBe(5);
    expect(invalidArgs.error.code).toBe(-32602);
    expect(invalidArgs.error.data).toContain('query');
  });

  it('lists registered tools with bilingual descriptions and strict JSON schemas (tools/list)', async () => {
    const server = new McpServer({ projectRoot: tmpDir, lang: 'fr' });
    await server.handleMessage(
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    );

    const listRaw = await server.handleMessage(
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    );
    const listRes = JSON.parse(listRaw!);
    expect(listRes.id).toBe(2);
    expect(Array.isArray(listRes.result.tools)).toBe(true);

    const toolNames = listRes.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('scan');
    expect(toolNames).toContain('audit');
    expect(toolNames).toContain('backlog');
    expect(toolNames).toContain('search_fts');
    expect(toolNames).toContain('compare_code_crawl');
    expect(toolNames).toContain('record_decision');

    for (const tool of listRes.result.tools) {
      expect(tool.name).toBeTypeOf('string');
      expect(tool.title).toBeTypeOf('string');
      expect(tool.description).toBeTypeOf('string');
      expect(tool.inputSchema).toBeTypeOf('object');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
  });

  it('executes automatic initial scan when invoking tools on unindexed project (FR-010)', async () => {
    // Write sample route file in project
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'pages', 'index.html'),
      '<!DOCTYPE html><html><head><title>Home</title></head><body><h1>Home</h1></body></html>',
    );

    const server = new McpServer({ projectRoot: tmpDir, lang: 'en' });
    await server.handleMessage(
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    );

    // Call audit tool directly without running scan first
    const auditCallRaw = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'audit' },
      }),
    );
    const auditRes = JSON.parse(auditCallRaw!);
    expect(auditRes.id).toBe(2);
    expect(auditRes.result.content[0].text).toContain('initial scan performed');
    expect(auditRes.result.structuredContent.totalFindings).toBeGreaterThanOrEqual(0);
  });

  it('executes record_decision, search_fts, backlog with F-R3 priority, and compare_code_crawl with untrustedExternal tag', async () => {
    // 1. Initialise project
    runInitCommand({ projectRoot: tmpDir, lang: 'en' });
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'pages', 'tarifs.html'),
      '<!DOCTYPE html><html><head><title>Nos Tarifs</title><meta name="robots" content="noindex"></head><body><h1>Tarifs Abonnements</h1></body></html>',
    );

    const server = new McpServer({ projectRoot: tmpDir, lang: 'fr' });
    await server.handleMessage(
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    );

    // Scan
    await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'scan' },
      }),
    );

    // Audit to generate findings and backlog actions
    await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'audit' },
      }),
    );

    // Record decision
    const decisionCallRaw = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'record_decision',
          arguments: {
            title: 'Noindex sur la page tarifs',
            rationale: 'Tarifs en cours de renégociation',
          },
        },
      }),
    );
    const decisionRes = JSON.parse(decisionCallRaw!);
    expect(decisionRes.id).toBe(4);
    expect(decisionRes.result.structuredContent.title).toBe('Noindex sur la page tarifs');
    expect(fs.readFileSync(path.join(tmpDir, '.seo', 'decisions.md'), 'utf-8')).toContain(
      'Noindex sur la page tarifs',
    );

    // Search FTS
    const ftsCallRaw = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'search_fts',
          arguments: { query: 'tarifs' },
        },
      }),
    );
    const ftsRes = JSON.parse(ftsCallRaw!);
    expect(ftsRes.id).toBe(5);
    expect(ftsRes.result.structuredContent.results.length).toBeGreaterThan(0);

    // Backlog: verify F-R3 indexation blockers are placed first
    const backlogCallRaw = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'backlog' },
      }),
    );
    const backlogRes = JSON.parse(backlogCallRaw!);
    expect(backlogRes.id).toBe(6);
    const items = backlogRes.result.structuredContent.items;
    if (items.length > 0) {
      // If there are index blockers, the first items must have blocksIndexing === true
      const hasBlocker = items.some((i: any) => i.blocksIndexing);
      if (hasBlocker) {
        expect(items[0].blocksIndexing).toBe(true);
      }
    }

    // Compare code vs crawl: verify untrustedExternal tag
    const compareCallRaw = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'compare_code_crawl' },
      }),
    );
    const compareRes = JSON.parse(compareCallRaw!);
    expect(compareRes.id).toBe(7);
    expect(compareRes.result.structuredContent.untrustedExternal).toBe(true);
    expect(compareRes.result.content[0].text).toContain('non fiable');
  });

  it('runs stdio server with pipe streams and guarantees zero non-JSON lines on stdout (FR-003)', async () => {
    const input = new Readable({ read() {} });
    const outputLines: string[] = [];
    const output = new Writable({
      write(chunk, _encoding, callback) {
        const str = chunk.toString();
        const lines = str.split('\n').filter((l: string) => l.trim().length > 0);
        outputLines.push(...lines);
        callback();
      },
    });

    const serverPromise = runStdioServer(
      { projectRoot: tmpDir },
      { input, output },
    );

    // Send initialize request and ping
    input.push(JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'initialize' }) + '\n');
    input.push(JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'ping' }) + '\n');
    input.push(null); // EOF on stdin

    await serverPromise;

    expect(outputLines.length).toBe(2);
    for (const line of outputLines) {
      // Must be valid JSON without any non-JSON prefix or suffix
      expect(() => JSON.parse(line)).not.toThrow();
      const obj = JSON.parse(line);
      expect(obj.jsonrpc).toBe('2.0');
    }
  });

  it('merges MCP configurations without overwriting other servers (init --with-mcp, FR-008)', () => {
    // 1. Claude Code .mcp.json pre-existing with existing server
    const claudeMcpPath = path.join(tmpDir, '.mcp.json');
    fs.writeFileSync(
      claudeMcpPath,
      JSON.stringify(
        {
          mcpServers: {
            'custom-server': {
              command: 'custom-cli',
              args: ['serve'],
            },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    // 2. Cursor .cursor/mcp.json corrupt
    const cursorDir = path.join(tmpDir, '.cursor');
    fs.mkdirSync(cursorDir, { recursive: true });
    const cursorMcpPath = path.join(cursorDir, 'mcp.json');
    fs.writeFileSync(cursorMcpPath, '{ invalid json', 'utf-8');

    // 3. Codex .codex/config.toml
    const codexDir = path.join(tmpDir, '.codex');
    fs.mkdirSync(codexDir, { recursive: true });
    const codexTomlPath = path.join(codexDir, 'config.toml');
    fs.writeFileSync(codexTomlPath, 'theme = "dark"\n', 'utf-8');

    const snippets = buildMcpConfigSnippets(['claude', 'cursor', 'codex', 'gemini', 'agy']);
    const merged = writeMcpConfig(tmpDir, snippets);

    // Claude: merged without overwriting custom-server
    const claudeResult = merged.find((s) => s.ide === 'claude');
    expect(claudeResult?.written).toBe(true);
    const claudeJson = JSON.parse(fs.readFileSync(claudeMcpPath, 'utf-8'));
    expect(claudeJson.mcpServers['custom-server']).toBeDefined();
    expect(claudeJson.mcpServers['seo-partner']).toEqual({
      command: 'seo-partner',
      args: ['mcp'],
    });

    // Cursor: corrupt JSON kept intact without crash or overwrite
    const cursorResult = merged.find((s) => s.ide === 'cursor');
    expect(cursorResult?.written).toBe(false);
    expect(cursorResult?.warning).toContain('contains invalid JSON');
    expect(fs.readFileSync(cursorMcpPath, 'utf-8')).toBe('{ invalid json');

    // Codex: TOML section appended cleanly
    const codexResult = merged.find((s) => s.ide === 'codex');
    expect(codexResult?.written).toBe(true);
    const tomlContent = fs.readFileSync(codexTomlPath, 'utf-8');
    expect(tomlContent).toContain('theme = "dark"');
    expect(tomlContent).toContain('[mcp_servers.seo-partner]');
  });

  it('exposes propose_patch in tools/list, enforces read-only guard without --allow-apply, and applies patches when authorized (US2, FR-006, FR-012)', async () => {
    runInitCommand({ projectRoot: tmpDir, lang: 'en' });
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });
    const pagePath = path.join(tmpDir, 'pages', 'test-mcp.html');
    fs.writeFileSync(
      pagePath,
      '<!DOCTYPE html><html><head></head><body><h1>Title Missing</h1></body></html>',
    );

    // 1. Verify tools/list has 7 tools
    const serverReadOnly = new McpServer({ projectRoot: tmpDir, allowApply: false, lang: 'en' });
    await serverReadOnly.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }));
    const listRaw = await serverReadOnly.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    const listRes = JSON.parse(listRaw!);
    expect(listRes.result.tools.length).toBe(7);
    expect(listRes.result.tools.map((t: any) => t.name)).toContain('propose_patch');

    // 2. Call propose_patch without apply -> leaves files intact
    const proposeRaw = await serverReadOnly.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'propose_patch', arguments: { ruleId: 'R-ONPAGE-01' } },
      }),
    );
    const proposeRes = JSON.parse(proposeRaw!);
    expect(proposeRes.id).toBe(3);
    expect(proposeRes.result.isError).toBeFalsy();
    expect(proposeRes.result.structuredContent.applied).toBe(false);
    expect(fs.readFileSync(pagePath, 'utf-8')).not.toContain('<title>');

    // 3. Call propose_patch with apply: true on read-only server -> rejected with isError: true (FR-012)
    const unauthorizedApplyRaw = await serverReadOnly.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'propose_patch', arguments: { apply: true } },
      }),
    );
    const unauthorizedApply = JSON.parse(unauthorizedApplyRaw!);
    expect(unauthorizedApply.id).toBe(4);
    expect(unauthorizedApply.result.isError).toBe(true);
    expect(unauthorizedApply.result.content[0].text).toContain('read-only mode');
    expect(unauthorizedApply.result.structuredContent.code).toBe('apply-not-allowed');

    // 4. Start server with allowApply: true -> apply: true succeeds and creates backup
    const serverWritable = new McpServer({ projectRoot: tmpDir, allowApply: true, lang: 'en' });
    await serverWritable.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'initialize' }));
    const authorizedApplyRaw = await serverWritable.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: { name: 'propose_patch', arguments: { ruleId: 'R-ONPAGE-01', apply: true } },
      }),
    );
    const authorizedApply = JSON.parse(authorizedApplyRaw!);
    expect(authorizedApply.id).toBe(11);
    expect(authorizedApply.result.isError).toBeFalsy();
    expect(authorizedApply.result.structuredContent.applied).toBe(true);
    expect(authorizedApply.result.structuredContent.backupDir).not.toBeNull();
    expect(fs.readFileSync(pagePath, 'utf-8')).toContain('<title>TODO-SEO</title>');
  });
});
