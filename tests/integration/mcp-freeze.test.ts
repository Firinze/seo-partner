import { describe, expect, it } from 'vitest';
import { McpServer } from '@seo-partner/mcp';
import { FROZEN_MCP_TOOL_NAMES } from '../../specs/009-v10-hardening-release-ga/contracts/frozen-api-v1.js';

describe('US3: MCP Stdio Tools Contract Freeze & Schema Strictness', () => {
  it('exposes exactly 13 frozen MCP tools with strict additionalProperties: false', async () => {
    const server = new McpServer({ projectRoot: process.cwd(), lang: 'en' });

    // Initialize MCP server session
    await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    );

    // Call tools/list
    const rawListResponse = await server.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
    );

    expect(rawListResponse).toBeDefined();
    const listRes = JSON.parse(rawListResponse!);
    expect(listRes.result).toBeDefined();

    const tools: Array<{
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, any>;
    }> = listRes.result.tools;

    expect(tools).toHaveLength(13);

    const toolNames = tools.map((t) => t.name);
    for (const expectedTool of FROZEN_MCP_TOOL_NAMES) {
      expect(toolNames).toContain(expectedTool);
    }

    for (const tool of tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
  });

  it('provides bilingual descriptions for French users when requested', async () => {
    const serverFr = new McpServer({ projectRoot: process.cwd(), lang: 'fr' });

    await serverFr.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          clientInfo: { name: 'test-client-fr', version: '1.0.0' },
        },
      }),
    );

    const rawRes = await serverFr.handleMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
    );

    const res = JSON.parse(rawRes!);
    const scanTool = res.result.tools.find((t: any) => t.name === 'scan');
    expect(scanTool).toBeDefined();
    expect(scanTool.title).toMatch(/scan|analyser|indexer/i);
  });
});
