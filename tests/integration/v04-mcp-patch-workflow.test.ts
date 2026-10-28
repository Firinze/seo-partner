import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiResponseEnvelope, PatchBatchResult } from '@seo-partner/core';
import { executeCli } from 'seo-partner';
import { McpServer } from '@seo-partner/mcp';
import { createLocalApiApp } from '@seo-partner/server';

describe('E2E Integration Workflow v0.4 — MCP Server, Safe Patch Remediation & Multi-IDE Integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-v04-e2e-'));
    fs.mkdirSync(path.join(tmpDir, 'app'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'public'), { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'v04-test-app', dependencies: { next: '15.1.0' } }, null, 2),
      'utf-8',
    );

    // Initial page missing <title>, missing robots.txt
    fs.writeFileSync(
      path.join(tmpDir, 'app', 'page.tsx'),
      `
export default function HomePage() {
  return <main><h1>Titre Principal</h1></main>;
}
      `.trim(),
      'utf-8',
    );

    // Initialize clean git repository
    execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
    execSync('git config user.name "Integration Test"', { cwd: tmpDir, stdio: 'ignore' });
    execSync('git config user.email "test@seo-partner.local"', { cwd: tmpDir, stdio: 'ignore' });
    execSync('git add .', { cwd: tmpDir, stdio: 'ignore' });
    execSync('git commit -m "initial commit"', { cwd: tmpDir, stdio: 'ignore' });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('completes the full end-to-end v0.4 lifecycle across CLI, MCP, Patch Engine, and Local REST API', async () => {
    // Step 1: Run seo-partner init --with-mcp --ide cursor
    const initRes = await executeCli([
      'init',
      '--cwd',
      tmpDir,
      '--here',
      '--with-mcp',
      '--ide',
      'cursor',
      '--lang',
      'fr',
      '--json',
    ]);
    expect(initRes.exitCode).toBe(0);
    const initData = JSON.parse(initRes.stdout);
    expect(initData.success).toBe(true);

    const cursorMcpPath = path.join(tmpDir, '.cursor', 'mcp.json');
    expect(fs.existsSync(cursorMcpPath)).toBe(true);
    const cursorMcpContent = JSON.parse(fs.readFileSync(cursorMcpPath, 'utf-8'));
    expect(cursorMcpContent.mcpServers?.['seo-partner']).toBeDefined();
    expect(cursorMcpContent.mcpServers['seo-partner'].command).toBe('seo-partner');
    expect(cursorMcpContent.mcpServers['seo-partner'].args).toContain('mcp');

    // Commit init files so git working tree remains clean for patch engine
    execSync('git add .', { cwd: tmpDir, stdio: 'ignore' });
    execSync('git commit -m "add init and mcp config"', { cwd: tmpDir, stdio: 'ignore' });

    // Step 2: Run seo-partner scan
    const scanRes = await executeCli(['scan', '--cwd', tmpDir, '--json']);
    expect(scanRes.exitCode).toBe(0);
    const scanData = JSON.parse(scanRes.stdout);
    expect(scanData.success).toBe(true);

    // Step 3: Instantiate MCP Server and run tools/call for run_audit
    const mcpServer = new McpServer({
      projectRoot: tmpDir,
      lang: 'fr',
      allowApply: false,
    });

    // Handshake
    await mcpServer.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    );
    await mcpServer.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
    );

    const auditCallMsg = await mcpServer.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'audit',
          arguments: {},
        },
      }),
    );
    expect(auditCallMsg).toBeDefined();
    const auditRpc = JSON.parse(auditCallMsg!);
    expect(auditRpc.result.isError).toBeFalsy();
    const auditData = auditRpc.result.structuredContent as { totalFindings: number };
    expect(auditData.totalFindings).toBeGreaterThanOrEqual(1);

    // Step 4: Run tools/call for propose_patch (dry-run)
    const proposeCallMsg = await mcpServer.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'propose_patch',
          arguments: {},
        },
      }),
    );
    expect(proposeCallMsg).toBeDefined();
    const proposeRpc = JSON.parse(proposeCallMsg!);
    expect(proposeRpc.result.isError).toBeFalsy();
    const patchProposalData = proposeRpc.result.structuredContent as PatchBatchResult;
    expect(patchProposalData.batchId).toBeDefined();
    expect(patchProposalData.applied).toBe(false);
    expect(patchProposalData.proposals.length).toBeGreaterThanOrEqual(1);

    // Verify .seo/patches/<batchId>.diff was written
    const diffDiskPath = path.join(tmpDir, patchProposalData.diffPath);
    expect(fs.existsSync(diffDiskPath)).toBe(true);

    // Step 5: Run tools/call for propose_patch with apply: true without --allow-apply -> verify refusal
    const applyRefusalMsg = await mcpServer.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'propose_patch',
          arguments: { apply: true },
        },
      }),
    );
    expect(applyRefusalMsg).toBeDefined();
    const refusalRpc = JSON.parse(applyRefusalMsg!);
    expect(refusalRpc.result.isError).toBe(true);
    expect(refusalRpc.result.content[0].text).toContain('--allow-apply');
    expect(refusalRpc.result.structuredContent.code).toBe('apply-not-allowed');

    // Step 6: Run CLI seo-partner patch --apply
    const cliPatchRes = await executeCli(['patch', '--cwd', tmpDir, '--apply', '--json']);
    expect(cliPatchRes.exitCode).toBe(0);
    const patchData = JSON.parse(cliPatchRes.stdout);
    expect(patchData.success).toBe(true);

    // Verify backup directory created in .seo/backups/
    const backupsDir = path.join(tmpDir, '.seo', 'backups');
    expect(fs.existsSync(backupsDir)).toBe(true);
    const backupFolders = fs.readdirSync(backupsDir);
    expect(backupFolders.length).toBeGreaterThanOrEqual(1);

    // Verify robots.txt was created or page was modified
    const robotsPath = path.join(tmpDir, 'public', 'robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
    expect(robotsContent).toContain('User-agent: *');

    // Step 7: Call GET /api/v1/patches via createLocalApiApp
    const app = createLocalApiApp({ projectRoot: tmpDir, port: 4321, defaultLang: 'fr' });
    const patchesRes = await app.request('/api/v1/patches');
    expect(patchesRes.status).toBe(200);

    const patchesEnvelope = (await patchesRes.json()) as ApiResponseEnvelope<{
      total: number;
      batches: ReadonlyArray<PatchBatchResult>;
    }>;
    expect(patchesEnvelope.success).toBe(true);
    expect(patchesEnvelope.data.total).toBeGreaterThanOrEqual(1);

    const latestBatch = patchesEnvelope.data.batches[0];
    expect(latestBatch).toBeDefined();
    expect(latestBatch?.applied).toBe(true);
    expect(latestBatch?.backupDir).toBeDefined();
    expect(latestBatch?.backupDir).toContain('.seo/backups');
  });
});
