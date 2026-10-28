import fs from 'node:fs';
import path from 'node:path';
import type { WatchEvent, WatchEventType } from '@seo-partner/core';

export interface NativeFsWatcherOptions {
  rootPath: string;
  scope?: string;
  ignoredPatterns?: string[];
}

export class NativeFsWatcher {
  private readonly rootPath: string;
  private readonly targetDir: string;
  private readonly ignoredPatterns: string[];
  private watchers: fs.FSWatcher[] = [];
  private eventListeners: Array<(event: WatchEvent) => void> = [];
  private errorListeners: Array<(err: Error) => void> = [];
  private isClosed = false;

  constructor(options: NativeFsWatcherOptions) {
    this.rootPath = path.resolve(options.rootPath);
    this.targetDir = options.scope
      ? path.resolve(this.rootPath, options.scope)
      : this.rootPath;

    this.ignoredPatterns = options.ignoredPatterns ?? [
      'node_modules',
      '.git',
      '.seo',
      'dist',
      'build',
      '.next',
      '.turbo',
      'vendor',
      'coverage',
      '.env',
    ];
  }

  public isIgnored(targetPath: string): boolean {
    const rel = path.relative(this.rootPath, targetPath).replace(/\\/g, '/');
    const segments = rel.split('/');

    return this.ignoredPatterns.some((pattern) => {
      return segments.some((seg) => seg === pattern || seg.startsWith(pattern + '.'));
    });
  }

  public async start(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    if (!fs.existsSync(this.targetDir)) {
      return;
    }

    const isWindows = process.platform === 'win32';
    const isDarwin = process.platform === 'darwin';

    if (isWindows || isDarwin) {
      // Native recursive watching supported on Win32 and macOS
      try {
        const watcher = fs.watch(
          this.targetDir,
          { recursive: true },
          (eventType, filename) => {
            if (!filename) return;
            const fullPath = path.resolve(this.targetDir, filename.toString());
            this.handleRawEvent(eventType, fullPath);
          },
        );

        watcher.on('error', (err) => {
          this.notifyError(err);
        });

        this.watchers.push(watcher);
      } catch (err: any) {
        this.notifyError(err);
      }
    } else {
      // Linux / Unix fallback: recursively register directory watchers
      await this.registerLinuxWatchers(this.targetDir);
    }
  }

  private async registerLinuxWatchers(dir: string): Promise<void> {
    if (this.isIgnored(dir) || this.isClosed) {
      return;
    }

    try {
      const watcher = fs.watch(dir, (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.resolve(dir, filename.toString());

        // Check if a new subdirectory was created to watch it
        try {
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            this.registerLinuxWatchers(fullPath).catch(() => {});
          }
        } catch {
          // File might have been deleted quickly
        }

        this.handleRawEvent(eventType, fullPath);
      });

      watcher.on('error', (err) => {
        this.notifyError(err);
      });

      this.watchers.push(watcher);

      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.resolve(dir, entry.name);
          if (!this.isIgnored(subDir)) {
            await this.registerLinuxWatchers(subDir);
          }
        }
      }
    } catch (err: any) {
      this.notifyError(err);
    }
  }

  private handleRawEvent(fsEventType: string, fullPath: string): void {
    if (this.isClosed || this.isIgnored(fullPath)) {
      return;
    }

    let eventType: WatchEventType = 'change';
    const exists = fs.existsSync(fullPath);

    if (fsEventType === 'rename') {
      eventType = exists ? 'add' : 'unlink';
    } else {
      eventType = exists ? 'change' : 'unlink';
    }

    const relPath = path.relative(this.rootPath, fullPath).replace(/\\/g, '/');

    const event: WatchEvent = {
      filePath: relPath,
      eventType,
      timestamp: new Date().toISOString(),
    };

    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Safe listener execution
      }
    }
  }

  public onEvent(callback: (event: WatchEvent) => void): void {
    this.eventListeners.push(callback);
  }

  public onError(callback: (err: Error) => void): void {
    this.errorListeners.push(callback);
  }

  private notifyError(err: Error): void {
    for (const listener of this.errorListeners) {
      try {
        listener(err);
      } catch {
        // Safe listener execution
      }
    }
  }

  public close(): void {
    this.isClosed = true;
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {
        // Ignore close error
      }
    }
    this.watchers = [];
    this.eventListeners = [];
    this.errorListeners = [];
  }

  public get activeWatchersCount(): number {
    return this.watchers.length;
  }
}

