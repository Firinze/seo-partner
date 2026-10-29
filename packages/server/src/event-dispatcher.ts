import { SseHub, type CrawlProgressEvent, type ProposalEvent } from './sse-hub.js';
import { globalSseBroadcaster } from './sse.js';

export class EventDispatcher {
  private hub: SseHub;

  constructor(hub?: SseHub) {
    this.hub = hub ?? new SseHub(globalSseBroadcaster);
  }

  public notifyCrawlProgress(event: CrawlProgressEvent): void {
    this.hub.emitCrawlProgress(event);
  }

  public notifyAuditCompleted(summary: Record<string, unknown>): void {
    this.hub.emitAuditCompleted(summary);
  }

  public notifyProposalCreated(event: ProposalEvent): void {
    this.hub.emitProposalCreated(event);
  }

  public notifyProposalApplied(event: ProposalEvent): void {
    this.hub.emitProposalApplied(event);
  }
}

export const globalEventDispatcher = new EventDispatcher();

