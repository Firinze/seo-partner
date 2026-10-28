import type { WatchEvent, SsePayload, SseAuditCompletedData } from '@seo-partner/core';
import { NativeFsWatcher } from '../watcher/fs-watcher.js';
import { Debouncer } from '../watcher/debouncer.js';
import { runScanCommand } from './scan.js';
import { runAuditCommand } from './audit.js';

export interface WatchEngineOptions {
  projectRoot: string;
  scope?: string;
  debounceMs?: number;
  notify?: boolean;
  onEvent?: (event: WatchEvent) => void;
  onReevaluated?: (stats: {
    filesScanned: number;
    findingsCount: number;
    blockingCount: number;
    durationMs: number;
  }) => void;
  onBlockingAlert?: (message: string) => void;
  sseBroadcaster?: {
    broadcast: (payload: SsePayload<any>) => void;
  };
}

export class WatchEngine {
  private readonly options: WatchEngineOptions;
  private readonly watcher: NativeFsWatcher;
  private readonly debouncer: Debouncer;
  private isRunning = false;

  constructor(options: WatchEngineOptions) {
    this.options = options;
    this.watcher = new NativeFsWatcher({
      rootPath: options.projectRoot,
      scope: options.scope,
    });
    this.debouncer = new Debouncer({
      debounceMs: options.debounceMs ?? 300,
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;

    this.debouncer.setCallback(async ({ files, isAvalanche }) => {
      await this.handleBatch(files, isAvalanche);
    });

    this.watcher.onEvent((event) => {
      this.options.onEvent?.(event);
      this.debouncer.push(event.filePath);
    });

    await this.watcher.start();
  }

  private async handleBatch(files: string[], isAvalanche: boolean): Promise<void> {
    const startTime = Date.now();

    // Broadcast audit:started event
    this.options.sseBroadcaster?.broadcast({
      type: 'audit:started',
      data: { filesCount: files.length, isAvalanche },
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Run incremental scan
      const scanResult = await runScanCommand({
        projectRoot: this.options.projectRoot,
        scopeDir: this.options.scope,
        rebuild: isAvalanche,
      });

      // 2. Run rules audit
      const auditResult = await runAuditCommand({
        projectRoot: this.options.projectRoot,
      });

      const durationMs = Date.now() - startTime;

      // 3. Check for blocking indexing issues
      if (auditResult.blockingIndexingCount > 0) {
        const blockingFindings = auditResult.findings.filter((f) => f.blocksIndexing);
        const alertMessage = `ALERT: ${auditResult.blockingIndexingCount} blocking issue(s) detected (${blockingFindings.map((f) => f.ruleId).join(', ')})`;

        this.options.sseBroadcaster?.broadcast({
          type: 'finding:blocking',
          data: {
            count: auditResult.blockingIndexingCount,
            findings: blockingFindings,
          },
          timestamp: new Date().toISOString(),
        });

        if (this.options.notify) {
          this.options.onBlockingAlert?.(alertMessage);
        }
      }

      // 4. Broadcast audit:completed event
      const completedData: SseAuditCompletedData = {
        filesScanned: scanResult.filesScanned,
        routesCount: scanResult.routesDiscovered,
        totalFindings: auditResult.totalFindings,
        blockingIndexingCount: auditResult.blockingIndexingCount,
        bySeverity: auditResult.bySeverity,
        durationMs,
      };

      this.options.sseBroadcaster?.broadcast({
        type: 'audit:completed',
        data: completedData,
        timestamp: new Date().toISOString(),
      });

      this.options.onReevaluated?.({
        filesScanned: scanResult.filesScanned,
        findingsCount: auditResult.totalFindings,
        blockingCount: auditResult.blockingIndexingCount,
        durationMs,
      });
    } catch {
      // Graceful error handling in watch daemon
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.debouncer.clear();
    this.watcher.close();
  }

  public get active(): boolean {
    return this.isRunning;
  }
}

