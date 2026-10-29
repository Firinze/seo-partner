import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { SupportedLanguage, ToolContext, ToolResult } from '@seo-partner/core';
import { getTool, listTools, registerTool, type ToolDefinition, type ToolValidationResult } from '@seo-partner/tools';
import { AutonomousAgent } from '@seo-partner/agent';
import { generateSemanticCopyTool } from './tools/semantic.js';
import {
  createErrorResponse,
  createSuccessResponse,
  JSONRPC_ERRORS,
  type JsonRpcId,
  type JsonRpcMessage,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from './jsonrpc.js';

export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
] as const;

export type SupportedProtocolVersion = typeof SUPPORTED_PROTOCOL_VERSIONS[number];

export interface McpServerOptions {
  readonly projectRoot: string;
  readonly allowApply?: boolean;
  readonly lang?: SupportedLanguage;
}

export interface McpToolCallResult {
  readonly content: ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;
  readonly structuredContent?: unknown;
  readonly isError?: boolean;
}

export class McpServer {
  private readonly projectRoot: string;
  private readonly allowApply: boolean;
  private readonly lang: SupportedLanguage;
  private isInitialized = false;
  private negotiatedProtocolVersion: SupportedProtocolVersion = '2025-06-18';

  constructor(options: McpServerOptions) {
    this.projectRoot = options.projectRoot;
    this.allowApply = Boolean(options.allowApply);
    this.lang = options.lang ?? 'en';
    registerTool(generateSemanticCopyTool);
  }

  public getContext(): ToolContext {
    return {
      projectRoot: this.projectRoot,
      allowApply: this.allowApply,
      lang: this.lang,
    };
  }

  public async handleMessage(rawMessage: string): Promise<string | null> {
    const trimmed = rawMessage.trim();
    if (!trimmed) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const err = createErrorResponse(
        null,
        JSONRPC_ERRORS.PARSE_ERROR,
        'Parse error: invalid JSON received',
      );
      return JSON.stringify(err);
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      const err = createErrorResponse(
        null,
        JSONRPC_ERRORS.INVALID_REQUEST,
        'Invalid Request: message must be an object',
      );
      return JSON.stringify(err);
    }

    const rec = parsed as Record<string, unknown>;
    if (rec.jsonrpc !== '2.0' || typeof rec.method !== 'string') {
      const id = typeof rec.id === 'string' || typeof rec.id === 'number' ? rec.id : null;
      const err = createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_REQUEST,
        'Invalid Request: expected jsonrpc: "2.0" and string method',
      );
      return JSON.stringify(err);
    }

    const isNotification = rec.id === undefined;
    const msgId = (rec.id as string | number) ?? null;
    const method = rec.method as string;
    const params = rec.params as Record<string, unknown> | undefined;

    // Dispatch methods
    try {
      if (isNotification) {
        await this.handleNotification(method, params);
        return null;
      }

      const res = await this.handleRequest(msgId, method, params);
      return JSON.stringify(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (isNotification) return null;
      const errRes = createErrorResponse(
        msgId,
        JSONRPC_ERRORS.INTERNAL_ERROR,
        `Internal error: ${message}`,
      );
      return JSON.stringify(errRes);
    }
  }

  private async handleNotification(
    method: string,
    _params?: Record<string, unknown>,
  ): Promise<void> {
    if (method === 'notifications/initialized') {
      this.isInitialized = true;
    }
  }

  private async handleRequest(
    id: string | number,
    method: string,
    params?: Record<string, unknown>,
  ): Promise<JsonRpcResponse<unknown> | ReturnType<typeof createErrorResponse>> {
    if (method === 'initialize') {
      return this.handleInitialize(id, params);
    }

    if (method === 'ping') {
      return createSuccessResponse(id, {});
    }

    if (!this.isInitialized) {
      return createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_REQUEST,
        'Server not initialized. Call initialize first.',
      );
    }

    if (method === 'tools/list') {
      return this.handleToolsList(id);
    }

    if (method === 'tools/call') {
      return this.handleToolsCall(id, params);
    }

    return createErrorResponse(
      id,
      JSONRPC_ERRORS.METHOD_NOT_FOUND,
      `Method not found: ${method}`,
    );
  }

  private handleInitialize(
    id: string | number,
    params?: Record<string, unknown>,
  ): JsonRpcResponse<unknown> {
    const requestedVersion = params?.protocolVersion;
    if (
      typeof requestedVersion === 'string' &&
      (SUPPORTED_PROTOCOL_VERSIONS as ReadonlyArray<string>).includes(requestedVersion)
    ) {
      this.negotiatedProtocolVersion = requestedVersion as SupportedProtocolVersion;
    } else {
      this.negotiatedProtocolVersion = '2025-06-18';
    }

    this.isInitialized = true;

    return createSuccessResponse(id, {
      protocolVersion: this.negotiatedProtocolVersion,
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: 'seo-partner',
        version: '0.6.0',
      },
      instructions:
        'Deterministic local SEO scanner, crawler comparison, backlog priorisation, GSC/CWV connectors, and autonomous agent remediation engine.',
    });
  }

  private handleToolsList(id: string | number): JsonRpcResponse<unknown> {
    const tools = listTools().map((t) => ({
      name: t.name,
      title: t.title[this.lang] ?? t.title.en,
      description: t.description[this.lang] ?? t.description.en,
      inputSchema: t.inputSchema,
    }));

    return createSuccessResponse(id, { tools });
  }

  private async handleToolsCall(
    id: string | number,
    params?: Record<string, unknown>,
  ): Promise<JsonRpcResponse<McpToolCallResult> | ReturnType<typeof createErrorResponse>> {
    if (!params || typeof params.name !== 'string') {
      return createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_PARAMS,
        'tools/call requires a "name" string parameter',
        ['name'],
      );
    }

    const tool = getTool(params.name);
    if (!tool) {
      return createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_PARAMS,
        `Tool not found: ${params.name}`,
        ['name'],
      );
    }

    const args = params.arguments ?? {};
    const validation = tool.validateArgs(args);
    if (!validation.ok) {
      return createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_PARAMS,
        validation.error ?? 'Invalid tool arguments',
        validation.fields,
      );
    }

    try {
      const toolRes = await tool.execute(this.getContext(), validation.data);
      const isError = !toolRes.ok;

      return createSuccessResponse<McpToolCallResult>(id, {
        content: [
          {
            type: 'text',
            text: toolRes.summary,
          },
        ],
        structuredContent: toolRes.data,
        ...(isError ? { isError: true } : {}),
      });
    } catch (err: unknown) {
      // If error is an ApplyRefusal or business refusal
      if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
        const refusal = err as { readonly code: string; readonly message: string };
        return createSuccessResponse<McpToolCallResult>(id, {
          content: [
            {
              type: 'text',
              text: refusal.message,
            },
          ],
          structuredContent: refusal,
          isError: true,
        });
      }

      const message = err instanceof Error ? err.message : String(err);
      return createSuccessResponse<McpToolCallResult>(id, {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
        isError: true,
      });
    }
  }
}

export function runStdioServer(
  options: McpServerOptions,
  streams?: { readonly input: Readable; readonly output: Writable },
): Promise<void> {
  const input = streams?.input ?? process.stdin;
  const output = streams?.output ?? process.stdout;
  const debug = process.env.SEO_PARTNER_MCP_DEBUG === '1';

  const server = new McpServer(options);
  const rl = readline.createInterface({
    input,
    terminal: false,
  });

  return new Promise((resolve) => {
    let pending = Promise.resolve();

    rl.on('line', (line: string) => {
      pending = pending.then(async () => {
        try {
          if (debug) {
            process.stderr.write(`[mcp debug recv] ${line}\n`);
          }
          const response = await server.handleMessage(line);
          if (response !== null) {
            if (debug) {
              process.stderr.write(`[mcp debug send] ${response}\n`);
            }
            output.write(`${response}\n`);
          }
        } catch (err) {
          if (debug) {
            process.stderr.write(`[mcp debug error] ${err}\n`);
          }
        }
      });
    });

    rl.on('close', () => {
      pending.finally(() => {
        if (debug) {
          process.stderr.write('[mcp debug] stdin closed, shutting down\n');
        }
        resolve();
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Autonomous Agent MCP Tool
// ---------------------------------------------------------------------------

export interface RunAgentStepArgs {
  readonly goal: string;
  readonly maxIterations?: number;
  readonly autoApply?: boolean;
}

export const runAgentStepTool: ToolDefinition<RunAgentStepArgs> = {
  name: 'run_agent_step',
  title: {
    en: 'Run Autonomous Agent Step',
    fr: 'Exécuter une étape d agent autonome',
  },
  description: {
    en: 'Run one or more steps of the autonomous SEO agent loop to achieve a specific goal.',
    fr: 'Exécuter une ou plusieurs étapes de la boucle d agent autonome SEO pour accomplir un objectif.',
  },
  inputSchema: {
    type: 'object',
    properties: {
      goal: { type: 'string', description: 'The SEO objective or task to accomplish' },
      maxIterations: { type: 'number', description: 'Maximum iterations for this run (default 1)' },
      autoApply: { type: 'boolean', description: 'Whether to allow auto-applying safe patches' },
    },
    required: ['goal'],
    additionalProperties: false,
  },
  mutatesState: true,
  validateArgs(args: unknown): ToolValidationResult<RunAgentStepArgs> {
    if (!args || typeof args !== 'object') {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const a = args as Record<string, unknown>;
    if (typeof a['goal'] !== 'string' || !a['goal'].trim()) {
      return { ok: false, error: 'goal must be a non-empty string' };
    }
    return {
      ok: true,
      data: {
        goal: String(a['goal']).trim(),
        maxIterations: typeof a['maxIterations'] === 'number' ? a['maxIterations'] : undefined,
        autoApply: Boolean(a['autoApply']),
      },
    };
  },
  async execute(ctx: ToolContext, args: RunAgentStepArgs): Promise<ToolResult> {
    const agent = new AutonomousAgent();
    const result = await agent.run({
      projectRoot: ctx.projectRoot,
      goal: args.goal,
      maxIterations: args.maxIterations ?? 1,
      autoApply: args.autoApply && ctx.allowApply,
      lang: ctx.lang,
    });
    return {
      ok: result.session.status === 'completed',
      data: result,
      summary: result.summary,
      initialScanPerformed: false,
    };
  },
};

registerTool(runAgentStepTool);

