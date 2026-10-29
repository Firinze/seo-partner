import type { SsePayload } from '@seo-partner/core';

export interface RealtimeSyncHandlers {
  onCrawlProgress?: (data: {
    currentUrl: string;
    statusCode: number;
    visitedCount: number;
    totalDiscovered: number;
    estimatedRemainingMs: number;
  }) => void;
  onAuditCompleted?: (data: Record<string, unknown>) => void;
  onProposalCreated?: (data: {
    proposalId: string;
    targetFilePath: string;
    operationType: string;
    status: string;
  }) => void;
  onProposalApplied?: (data: {
    proposalId: string;
    targetFilePath: string;
    operationType: string;
    status: string;
  }) => void;
  onError?: (err: Event) => void;
}

export function subscribeToRealtimeSync(
  baseUrl = '',
  handlers: RealtimeSyncHandlers = {},
): () => void {
  const url = `${baseUrl}/api/sse`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data) as SsePayload;
      switch (payload.type) {
        case 'crawl:progress':
          handlers.onCrawlProgress?.(payload.data as any);
          break;
        case 'audit:completed':
          handlers.onAuditCompleted?.(payload.data as any);
          break;
        case 'proposal:created':
          handlers.onProposalCreated?.(payload.data as any);
          break;
        case 'proposal:applied':
          handlers.onProposalApplied?.(payload.data as any);
          break;
      }
    } catch {
      // Ignore unparseable SSE frame
    }
  };

  if (handlers.onError) {
    eventSource.onerror = handlers.onError;
  }

  return () => {
    eventSource.close();
  };
}

