import { describe, it, expect, vi } from 'vitest';
import { SseHub } from '../../packages/server/src/sse-hub.js';
import type { SseBroadcaster } from '../../packages/server/src/sse.js';

describe('SseHub', () => {
  it('broadcasts crawl:progress events with accurate payload', () => {
    const mockBroadcast = vi.fn();
    const mockBroadcaster = { broadcast: mockBroadcast } as unknown as SseBroadcaster;

    const hub = new SseHub(mockBroadcaster);
    hub.emitCrawlProgress({
      currentUrl: 'https://example.com/blog',
      statusCode: 200,
      visitedCount: 15,
      totalDiscovered: 50,
      estimatedRemainingMs: 3500,
    });

    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    const payload = mockBroadcast.mock.calls[0][0];
    expect(payload.type).toBe('crawl:progress');
    expect(payload.data.visitedCount).toBe(15);
    expect(payload.data.totalDiscovered).toBe(50);
  });

  it('broadcasts proposal:created and proposal:applied events', () => {
    const mockBroadcast = vi.fn();
    const mockBroadcaster = { broadcast: mockBroadcast } as unknown as SseBroadcaster;

    const hub = new SseHub(mockBroadcaster);
    hub.emitProposalCreated({
      proposalId: 'prop_123',
      targetFilePath: 'app/page.tsx',
      operationType: 'enrich_in_place',
      status: 'pending',
    });

    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    expect(mockBroadcast.mock.calls[0][0].type).toBe('proposal:created');

    hub.emitProposalApplied({
      proposalId: 'prop_123',
      targetFilePath: 'app/page.tsx',
      operationType: 'enrich_in_place',
      status: 'applied',
    });

    expect(mockBroadcast).toHaveBeenCalledTimes(2);
    expect(mockBroadcast.mock.calls[1][0].type).toBe('proposal:applied');
  });
});

