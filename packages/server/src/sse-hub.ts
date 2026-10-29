import { globalSseBroadcaster, SseBroadcaster } from './sse.js';
import type { SsePayload } from '@seo-partner/core';

export type SseEventType =
  | 'crawl:progress'
  | 'audit:completed'
  | 'proposal:created'
  | 'proposal:applied'
  | 'gsc:synced'
  | 'agent:step';

export interface CrawlProgressEvent {
  currentUrl: string;
  statusCode: number;
  visitedCount: number;
  totalDiscovered: number;
  estimatedRemainingMs: number;
}

export interface ProposalEvent {
  proposalId: string;
  targetFilePath: string;
  operationType: string;
  status: string;
}

export class SseHub {
  constructor(private readonly broadcaster: SseBroadcaster = globalSseBroadcaster) {}

  public emitCrawlProgress(data: CrawlProgressEvent): void {
    this.broadcaster.broadcast({
      type: 'crawl:progress',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  public emitAuditCompleted(data: Record<string, unknown>): void {
    this.broadcaster.broadcast({
      type: 'audit:completed',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  public emitProposalCreated(data: ProposalEvent): void {
    this.broadcaster.broadcast({
      type: 'proposal:created',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  public emitProposalApplied(data: ProposalEvent): void {
    this.broadcaster.broadcast({
      type: 'proposal:applied',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  public subscribe(listener: (payload: SsePayload) => void): () => void {
    return this.broadcaster.subscribe(listener);
  }
}

export const sseHub = new SseHub();

