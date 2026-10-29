import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createLocalApiApp } from '../src/app.js';
import { globalSseBroadcaster } from '../src/sse.js';
import type { AgentStreamEvent } from '@seo-partner/core';

describe('Agent Chat API & SSE (Unit/Contract)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-chat-api-test-'));
    fs.mkdirSync(path.join(tmpDir, '.seo'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.seo', 'config.json'),
      JSON.stringify({
        version: '1.0',
        projectName: 'chat-api-test',
        lang: 'fr',
        ideTargets: [],
        maxFileSizeKb: 500,
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      'utf-8',
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should return 400 when goal is missing on POST /api/v1/agent/run', async () => {
    const app = createLocalApiApp({ projectRoot: tmpDir });
    const res = await app.request('/api/v1/agent/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${app.getSessionToken()}`,
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('goal');
  });

  it('should return 400 when parameters are missing on POST /api/v1/agent/apply-patch', async () => {
    const app = createLocalApiApp({ projectRoot: tmpDir });
    const res = await app.request('/api/v1/agent/apply-patch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${app.getSessionToken()}`,
      },
      body: JSON.stringify({ sessionId: 'dummy-session' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
  });

  it('should broadcast and receive SSE agent stream events', async () => {
    const receivedEvents: AgentStreamEvent[] = [];
    const unsubscribe = globalSseBroadcaster.subscribe((payload) => {
      if (payload.type.startsWith('agent:')) {
        receivedEvents.push(payload.data as AgentStreamEvent);
      }
    });

    const testEvent: AgentStreamEvent = {
      type: 'agent:thought',
      sessionId: 'sess-123',
      timestamp: new Date().toISOString(),
      payload: { thought: 'Testing thought emission over SSE' },
    };

    globalSseBroadcaster.broadcastAgentEvent(testEvent);

    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].type).toBe('agent:thought');
    expect(receivedEvents[0].payload.thought).toBe('Testing thought emission over SSE');

    unsubscribe();
  });
});

