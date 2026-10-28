/**
 * EventSource SSE Client for Dashboard Live Updates
 */

export interface DashboardSseOptions {
  baseUrl?: string;
  onAuditStarted?: () => void;
  onAuditCompleted?: (data: any) => void;
  onRouteUpdated?: (data: any) => void;
  onFindingBlocking?: (data: any) => void;
  onError?: (err: any) => void;
}

export class DashboardSseClient {
  private eventSource: any = null;
  private isClosed = false;
  private readonly baseUrl: string;
  private readonly options: DashboardSseOptions;

  constructor(options: DashboardSseOptions = {}) {
    this.options = options;
    this.baseUrl = options.baseUrl ?? '';
  }

  public connect(): void {
    const g = globalThis as any;
    if (this.isClosed || typeof g.EventSource === 'undefined') {
      return;
    }

    try {
      const url = `${this.baseUrl}/api/v1/events`;
      const es = new g.EventSource(url);
      this.eventSource = es;

      es.addEventListener('audit:started', () => {
        this.options.onAuditStarted?.();
      });

      es.addEventListener('audit:completed', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          this.options.onAuditCompleted?.(data);
        } catch {
          // parse error
        }
      });

      es.addEventListener('route:updated', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          this.options.onRouteUpdated?.(data);
        } catch {
          // parse error
        }
      });

      es.addEventListener('finding:blocking', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          this.options.onFindingBlocking?.(data);
        } catch {
          // parse error
        }
      });

      es.onerror = (err: any) => {
        this.options.onError?.(err);
      };
    } catch (err: any) {
      this.options.onError?.(err);
    }
  }

  public disconnect(): void {
    this.isClosed = true;
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {
        // Safe close
      }
      this.eventSource = null;
    }
  }
}
