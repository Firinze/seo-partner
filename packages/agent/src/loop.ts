import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AgentRunSession,
  AgentStepLog,
  ToolContext,
  AgentStreamEvent,
} from '@seo-partner/core';
import {
  AgentRepository,
  ProjectRepository,
  SeoDatabase,
} from '@seo-partner/store';
import {
  getTool,
  listTools,
  runScanCommand,
} from '@seo-partner/tools';
import { createLlmAdapter } from './llm/factory.js';
import type {
  LlmMessage,
  LlmProviderAdapter,
  LlmProviderType,
  LlmToolDefinition,
} from './llm/types.js';
import { LoopGuard } from './loop-guard.js';

export interface AgentRunOptions {
  readonly projectRoot: string;
  readonly goal: string;
  readonly provider?: LlmProviderType;
  readonly model?: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly maxIterations?: number;
  readonly autoApply?: boolean;
  readonly signal?: AbortSignal;
  readonly adapter?: LlmProviderAdapter; // Optional injected adapter for tests
  readonly lang?: 'fr' | 'en';
  readonly onEvent?: (event: AgentStreamEvent) => void;
}

export interface AgentRunResult {
  readonly session: AgentRunSession;
  readonly steps: ReadonlyArray<AgentStepLog>;
  readonly summary: string;
}

export class AutonomousAgent {
  async run(options: AgentRunOptions): Promise<AgentRunResult> {
    const projectRoot = path.resolve(options.projectRoot);
    const store = SeoDatabase.open(projectRoot);

    let project = new ProjectRepository(store).getLatestProject();
    if (!project) {
      await runScanCommand({ projectRoot });
      project = new ProjectRepository(store).getLatestProject();
    }
    if (!project) {
      store.close();
      throw new Error('Unable to resolve or initialize project for autonomous agent loop.');
    }

    const resolvedLlm = options.adapter
      ? { adapter: options.adapter, defaultModel: options.model ?? 'injected-model' }
      : createLlmAdapter({
          provider: options.provider,
          model: options.model,
          apiKey: options.apiKey,
          baseUrl: options.baseUrl,
        });

    const modelName = options.model ?? resolvedLlm.defaultModel;
    const providerName = options.adapter?.provider ?? (options.provider ?? 'custom');

    const sessionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const maxIterations = options.maxIterations ?? 10;
    const autoApply = Boolean(options.autoApply);

    const agentRepo = new AgentRepository(store);
    const sessionRecord: AgentRunSession = {
      id: sessionId,
      projectId: project.id,
      goal: options.goal,
      modelName,
      provider: providerName as AgentRunSession['provider'],
      maxIterations,
      iterationsCompleted: 0,
      status: 'running',
      startedAt,
      completedAt: null,
      patchesGenerated: 0,
      patchesApplied: 0,
    };
    agentRepo.createSession(sessionRecord);

    // Setup JSONL log file
    const logDir = path.join(projectRoot, '.seo', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const logFilePath = path.join(logDir, `agent-${sessionId}.jsonl`);

    const logEntry = (data: Record<string, unknown>) => {
      try {
        fs.appendFileSync(logFilePath, JSON.stringify(data) + '\n', 'utf-8');
      } catch {
        // Best effort file logging
      }
    };

    logEntry({ type: 'session_start', session: sessionRecord });
    options.onEvent?.({
      type: 'agent:started',
      sessionId,
      timestamp: startedAt,
      payload: { summary: options.goal },
    });

    const guard = new LoopGuard({
      maxIterations,
      autoApply,
    });

    const steps: AgentStepLog[] = [];
    let patchesGenerated = 0;
    let patchesApplied = 0;
    let finalSummary = '';
    let finalStatus: AgentRunSession['status'] = 'completed';

    // Build available tool definitions for LLM
    const registeredTools = listTools();
    const llmTools: LlmToolDefinition[] = registeredTools.map((t) => ({
      name: t.name,
      description: t.description[options.lang ?? 'fr'] || t.description['en'],
      parameters: t.inputSchema as LlmToolDefinition['parameters'],
    }));

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: [
          'Tu es l\'Agent Autonome Spécialiste SEO de seo-partner.',
          'Ton rôle est d\'analyser, diagnostiquer et optimiser le projet en exécutant les outils disponibles de manière déterministe.',
          'Priorise tes actions selon l\'impact ICE et les signaux de blocage d\'indexation.',
          'Génère des propositions de correctifs propres avec propose_patch.',
          autoApply
            ? 'ATTENTION: Le mode auto-apply est activé. Les correctifs sûrs peuvent être appliqués directement.'
            : 'SÉCURITÉ: Le mode dry-run est actif par défaut. N\'applique aucune modification de fichier sans confirmation explicite.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: options.goal,
      },
    ];

    const toolContext: ToolContext = {
      projectRoot,
      allowApply: autoApply,
      lang: options.lang ?? 'fr',
    };

    try {
      while (true) {
        if (options.signal?.aborted) {
          finalStatus = 'aborted';
          finalSummary = 'Agent loop aborted by user signal.';
          break;
        }

        const iterCheck = guard.incrementIteration();
        if (!iterCheck.allowed) {
          finalSummary = iterCheck.reason ?? 'Iteration budget reached.';
          break;
        }

        // Call LLM
        const completion = await resolvedLlm.adapter.complete({
          model: modelName,
          messages,
          tools: llmTools,
        });

        const thought = completion.content;
        const toolCalls = completion.toolCalls;

        if (thought) {
          options.onEvent?.({
            type: 'agent:thought',
            sessionId,
            timestamp: new Date().toISOString(),
            payload: { thought },
          });
        }

        // If no tool calls requested, we reached a final answer
        if (!toolCalls || toolCalls.length === 0) {
          finalSummary = thought ?? 'Goal accomplished.';
          break;
        }

        // Add assistant response to history
        messages.push({
          role: 'assistant',
          content: thought ?? '',
          toolCalls,
        });

        for (const tc of toolCalls) {
          const check = guard.checkToolCall(tc.name, tc.arguments);
          if (!check.allowed) {
            finalSummary = check.reason ?? 'Loop guard violation';
            finalStatus = 'completed';
            const blockedResult = { ok: false, error: check.reason };
            messages.push({
              role: 'tool',
              toolCallId: tc.id,
              content: JSON.stringify(blockedResult),
            });
            break;
          }

          const sanitizedArgs = guard.sanitizeToolArguments(tc.name, tc.arguments);
          options.onEvent?.({
            type: 'agent:tool_call',
            sessionId,
            timestamp: new Date().toISOString(),
            payload: {
              toolName: tc.name,
              toolArguments: sanitizedArgs as Record<string, unknown>,
            },
          });
          const toolDef = getTool(tc.name);

          let toolResult: Record<string, unknown> = {};

          if (!toolDef) {
            toolResult = { ok: false, error: `Tool not found: ${tc.name}` };
          } else {
            try {
              const res = await toolDef.execute(toolContext, sanitizedArgs);
              toolResult = {
                ok: res.ok,
                summary: res.summary,
                data: res.data,
              };

              if (tc.name === 'propose_patch') {
                patchesGenerated += 1;
                if (autoApply && (res.data as any)?.applied) {
                  patchesApplied += 1;
                }
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              toolResult = { ok: false, error: msg };
            }
          }

          options.onEvent?.({
            type: 'agent:tool_result',
            sessionId,
            timestamp: new Date().toISOString(),
            payload: {
              toolName: tc.name,
              toolResult,
            },
          });

          if (tc.name === 'propose_patch' && toolResult.ok) {
            const patchData = (toolResult.data ?? {}) as Record<string, unknown>;
            options.onEvent?.({
              type: 'agent:patch_proposed',
              sessionId,
              timestamp: new Date().toISOString(),
              payload: {
                patchBatchId: String(patchData.batchId ?? ''),
                patchUnifiedDiff: String(patchData.unifiedDiff ?? ''),
              },
            });
          }

          const stepLog: AgentStepLog = {
            id: crypto.randomUUID(),
            sessionId,
            stepIndex: steps.length + 1,
            thought,
            toolName: tc.name,
            toolArguments: sanitizedArgs,
            toolResult,
            createdAt: new Date().toISOString(),
          };

          steps.push(stepLog);
          agentRepo.addStepLog(stepLog);
          logEntry({ type: 'step', step: stepLog });

          messages.push({
            role: 'tool',
            toolCallId: tc.id,
            content: JSON.stringify(toolResult),
          });
        }

        if (finalSummary) {
          break;
        }
      }
    } catch (err: unknown) {
      finalStatus = 'failed';
      finalSummary = err instanceof Error ? err.message : String(err);
      options.onEvent?.({
        type: 'agent:error',
        sessionId,
        timestamp: new Date().toISOString(),
        payload: { errorMessage: finalSummary },
      });
    } finally {
      const completedAt = new Date().toISOString();
      options.onEvent?.({
        type: 'agent:completed',
        sessionId,
        timestamp: completedAt,
        payload: { summary: finalSummary },
      });
      const finalSession: AgentRunSession = {
        ...sessionRecord,
        iterationsCompleted: guard.getIteration(),
        status: finalStatus,
        completedAt,
        patchesGenerated,
        patchesApplied,
      };

      agentRepo.updateSession({
        id: sessionId,
        iterationsCompleted: guard.getIteration(),
        status: finalStatus,
        completedAt,
        patchesGenerated,
        patchesApplied,
      });

      logEntry({ type: 'session_end', session: finalSession, summary: finalSummary });
      store.close();

      return {
        session: finalSession,
        steps,
        summary: finalSummary,
      };
    }
  }
}

