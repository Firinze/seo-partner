/**
 * In-memory Debouncer & Avalanche Batching Guard for File Events
 */

export interface DebouncerOptions {
  debounceMs?: number;
  avalancheThreshold?: number;
}

export type DebouncedBatchCallback = (batch: {
  files: string[];
  isAvalanche: boolean;
}) => void | Promise<void>;

export class Debouncer {
  private readonly debounceMs: number;
  private readonly avalancheThreshold: number;
  private timer: NodeJS.Timeout | null = null;
  private pendingFiles: Set<string> = new Set();
  private callback: DebouncedBatchCallback | null = null;

  constructor(options: DebouncerOptions = {}) {
    this.debounceMs = options.debounceMs ?? 300;
    this.avalancheThreshold = options.avalancheThreshold ?? 50;
  }

  public setCallback(callback: DebouncedBatchCallback): void {
    this.callback = callback;
  }

  public push(filePath: string): void {
    this.pendingFiles.add(filePath);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  public flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pendingFiles.size === 0) {
      return;
    }

    const files = Array.from(this.pendingFiles);
    this.pendingFiles.clear();

    const isAvalanche = files.length > this.avalancheThreshold;

    if (this.callback) {
      try {
        const res = this.callback({ files, isAvalanche });
        if (res instanceof Promise) {
          res.catch(() => {});
        }
      } catch {
        // Safe callback invocation
      }
    }
  }

  public get pendingCount(): number {
    return this.pendingFiles.size;
  }

  public clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingFiles.clear();
  }
}

