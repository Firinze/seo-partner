import { EventEmitter } from 'node:events';
import type { SsePayload } from '@seo-partner/core';

export class SseBroadcaster {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  public broadcast<T = unknown>(payload: SsePayload<T>): void {
    this.emitter.emit('sse:event', payload);
  }

  public subscribe(listener: (payload: SsePayload) => void): () => void {
    this.emitter.on('sse:event', listener);
    return () => {
      this.emitter.off('sse:event', listener);
    };
  }

  public get listenerCount(): number {
    return this.emitter.listenerCount('sse:event');
  }
}

export const globalSseBroadcaster = new SseBroadcaster();

