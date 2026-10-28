import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SseBroadcaster, createLocalApiApp } from '../../packages/server/src/index.js';
import { DashboardSseClient } from '../../packages/dashboard/src/index.js';
import type { SsePayload, SseAuditCompletedData } from '@seo-partner/core';

describe('US1: Server-Sent Events (SSE) Live Update Stream', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-sse-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('SseBroadcaster notifies subscribed listeners and manages listener count', () => {
    const broadcaster = new SseBroadcaster();
    expect(broadcaster.listenerCount).toBe(0);

    const received: SsePayload[] = [];
    const unsubscribe = broadcaster.subscribe((payload) => {
      received.push(payload);
    });

    expect(broadcaster.listenerCount).toBe(1);

    const payload: SsePayload<SseAuditCompletedData> = {
      type: 'audit:completed',
      data: {
        filesScanned: 10,
        routesCount: 4,
        totalFindings: 2,
        blockingIndexingCount: 1,
        bySeverity: { critical: 1, high: 1, medium: 0, low: 0 },
        durationMs: 45,
      },
      timestamp: new Date().toISOString(),
    };

    broadcaster.broadcast(payload);

    expect(received).toHaveLength(1);
    const firstEvent = received[0]!;
    expect(firstEvent.type).toBe('audit:completed');
    expect((firstEvent.data as SseAuditCompletedData).totalFindings).toBe(2);

    unsubscribe();
    expect(broadcaster.listenerCount).toBe(0);

    broadcaster.broadcast(payload);
    expect(received).toHaveLength(1); // No new events after unsubscribe
  });

  it('GET /api/v1/events establishes text/event-stream response on local API', async () => {
    const app = createLocalApiApp({ projectRoot: tempRoot, port: 4321 });

    const response = await app.request('http://127.0.0.1:4321/api/v1/events', {
      method: 'GET',
      headers: {
        Host: '127.0.0.1:4321',
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('cache-control')).toContain('no-cache');

    // Read initial stream chunk (ping connected)
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const chunk = await reader!.read();
    expect(chunk.done).toBe(false);
    const text = new TextDecoder().decode(chunk.value);
    expect(text).toContain('event: ping');
    expect(text).toContain('connected');

    await reader!.cancel();
  });

  it('DashboardSseClient handles listeners safely in non-browser or mock environment', () => {
    let started = false;
    let completedData: any = null;

    const client = new DashboardSseClient({
      baseUrl: 'http://127.0.0.1:4321',
      onAuditStarted: () => {
        started = true;
      },
      onAuditCompleted: (data) => {
        completedData = data;
      },
    });

    // In Node.js testing environment without globalThis.EventSource, connect should return gracefully
    expect(() => client.connect()).not.toThrow();
    expect(() => client.disconnect()).not.toThrow();
    expect(started).toBe(false);
    expect(completedData).toBeNull();
  });
});

