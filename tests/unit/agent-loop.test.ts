import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  LoopGuard,
  AutonomousAgent,
  type LlmProviderAdapter,
  type LlmCompletionRequest,
  type LlmCompletionResponse,
} from '@seo-partner/agent';
import { SeoDatabase } from '@seo-partner/store';

describe('LoopGuard', () => {
  it('enforces maximum iteration budget', () => {
    const guard = new LoopGuard({ maxIterations: 3, autoApply: false });

    expect(guard.incrementIteration().allowed).toBe(true);
    expect(guard.incrementIteration().allowed).toBe(true);
    expect(guard.incrementIteration().allowed).toBe(true);

    const overLimit = guard.incrementIteration();
    expect(overLimit.allowed).toBe(false);
    expect(overLimit.reason).toContain('Iteration budget reached');
  });

  it('detects and halts execution on identical repeated tool call cycle', () => {
    const guard = new LoopGuard({ maxIterations: 10, autoApply: false, maxRepeatedCalls: 3 });

    expect(guard.checkToolCall('scan', { rebuild: true }).allowed).toBe(true);
    expect(guard.checkToolCall('scan', { rebuild: true }).allowed).toBe(true);

    const cycle = guard.checkToolCall('scan', { rebuild: true });
    expect(cycle.allowed).toBe(false);
    expect(cycle.reason).toContain('Cycle detected');
  });

  it('sanitizes propose_patch apply flag in safe dry-run mode', () => {
    const guard = new LoopGuard({ maxIterations: 5, autoApply: false });

    const sanitized = guard.sanitizeToolArguments('propose_patch', {
      findingId: 'f_123',
      apply: true,
    });

    expect(sanitized['apply']).toBe(false);

    const allowGuard = new LoopGuard({ maxIterations: 5, autoApply: true });
    const applied = allowGuard.sanitizeToolArguments('propose_patch', {
      findingId: 'f_123',
      apply: true,
    });
    expect(applied['apply']).toBe(true);
  });
});

describe('AutonomousAgent Execution Loop', () => {
  it('executes ReAct cycle with simulated LLM, records session and writes jsonl log', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-agent-test-'));

    // Create a minimal project file
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'pages', 'index.html'), '<html><head><title>Home</title></head></html>');

    let callCount = 0;
    const mockAdapter: LlmProviderAdapter = {
      provider: 'custom',
      async complete(_req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
        callCount += 1;
        if (callCount === 1) {
          return {
            content: 'Je lance un scan pour inventorier les routes.',
            toolCalls: [
              {
                id: 'call_1',
                name: 'scan',
                arguments: {},
              },
            ],
            stopReason: 'tool_use',
          };
        }
        return {
          content: 'Le scan a identifié les routes du projet avec succès.',
          stopReason: 'end_turn',
        };
      },
    };

    const agent = new AutonomousAgent();
    const result = await agent.run({
      projectRoot: tmpDir,
      goal: 'Analyser le projet',
      adapter: mockAdapter,
      maxIterations: 5,
    });

    expect(result.session.status).toBe('completed');
    expect(result.session.iterationsCompleted).toBe(2);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.toolName).toBe('scan');
    expect(result.summary).toContain('Le scan a identifié les routes');

    // Verify SQLite persistence
    const store = SeoDatabase.open(tmpDir);
    const sessionRow = store.db.prepare('SELECT * FROM agent_run_session WHERE id = ?').get(result.session.id) as any;
    expect(sessionRow.status).toBe('completed');
    store.close();

    // Verify JSONL log file
    const logFilePath = path.join(tmpDir, '.seo', 'logs', `agent-${result.session.id}.jsonl`);
    expect(fs.existsSync(logFilePath)).toBe(true);
    const lines = fs.readFileSync(logFilePath, 'utf-8').trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(3); // start, step, end
  });

  it('halts safely when loop guard detects repeated tool calls cycle', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-agent-cycle-'));

    const mockAdapter: LlmProviderAdapter = {
      provider: 'custom',
      async complete(_req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
        return {
          content: 'Running scan again.',
          toolCalls: [
            {
              id: 'call_repeat',
              name: 'scan',
              arguments: { scopeDir: 'pages' },
            },
          ],
          stopReason: 'tool_use',
        };
      },
    };

    const agent = new AutonomousAgent();
    const result = await agent.run({
      projectRoot: tmpDir,
      goal: 'Infinite loop test',
      adapter: mockAdapter,
      maxIterations: 10,
    });

    expect(result.session.status).toBe('completed');
    expect(result.summary).toContain('Cycle detected');
  });
});

