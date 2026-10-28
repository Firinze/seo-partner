import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { NativeFsWatcher } from '../../packages/tools/src/watcher/fs-watcher.js';
import { Debouncer } from '../../packages/tools/src/watcher/debouncer.js';
import type { WatchEvent } from '@seo-partner/core';

describe('US1: NativeFsWatcher and Debouncer Engine', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-watch-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('correctly filters ignored patterns (node_modules, .git, .seo, dist)', () => {
    const watcher = new NativeFsWatcher({ rootPath: tempDir });

    expect(watcher.isIgnored(path.join(tempDir, 'node_modules', 'pkg', 'index.js'))).toBe(true);
    expect(watcher.isIgnored(path.join(tempDir, '.git', 'HEAD'))).toBe(true);
    expect(watcher.isIgnored(path.join(tempDir, '.seo', 'index.db'))).toBe(true);
    expect(watcher.isIgnored(path.join(tempDir, 'dist', 'bundle.js'))).toBe(true);
    expect(watcher.isIgnored(path.join(tempDir, '.env.local'))).toBe(true);
    expect(watcher.isIgnored(path.join(tempDir, 'src', 'pages', 'index.tsx'))).toBe(false);
    expect(watcher.isIgnored(path.join(tempDir, 'public', 'robots.txt'))).toBe(false);
  });

  it('detects file modifications and emits WatchEvent in temporary workspace', async () => {
    const watcher = new NativeFsWatcher({ rootPath: tempDir });
    await watcher.start();

    const receivedEvents: WatchEvent[] = [];
    watcher.onEvent((ev) => {
      receivedEvents.push(ev);
    });

    const testFile = path.join(tempDir, 'page.html');
    fs.writeFileSync(testFile, '<html><head><title>Initial</title></head></html>');

    // Wait for file system event propagation
    await new Promise((r) => setTimeout(r, 200));

    fs.writeFileSync(testFile, '<html><head><title>Updated</title></head></html>');

    await new Promise((r) => setTimeout(r, 250));

    watcher.close();

    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    const event = receivedEvents.find((e) => e.filePath.includes('page.html'));
    expect(event).toBeDefined();
    expect(event?.filePath).toBe('page.html');
    expect(['add', 'change']).toContain(event?.eventType);
  });

  it('Debouncer batches multiple changes and applies debounce delay', async () => {
    const debouncer = new Debouncer({ debounceMs: 50 });
    const batches: Array<{ files: string[]; isAvalanche: boolean }> = [];

    debouncer.setCallback((batch) => {
      batches.push(batch);
    });

    debouncer.push('src/a.ts');
    debouncer.push('src/b.ts');
    debouncer.push('src/a.ts');

    expect(debouncer.pendingCount).toBe(2);
    expect(batches).toHaveLength(0);

    // Wait for debounce flush
    await new Promise((r) => setTimeout(r, 100));

    expect(batches).toHaveLength(1);
    const firstBatch = batches[0]!;
    expect(firstBatch.files).toHaveLength(2);
    expect(firstBatch.files).toContain('src/a.ts');
    expect(firstBatch.files).toContain('src/b.ts');
    expect(firstBatch.isAvalanche).toBe(false);
  });

  it('Debouncer detects avalanche when pending files exceed avalancheThreshold', async () => {
    const debouncer = new Debouncer({ debounceMs: 20, avalancheThreshold: 10 });
    let capturedBatch: { files: string[]; isAvalanche: boolean } | null = null;

    debouncer.setCallback((batch) => {
      capturedBatch = batch;
    });

    for (let i = 0; i < 15; i++) {
      debouncer.push(`src/file-${i}.ts`);
    }

    expect(debouncer.pendingCount).toBe(15);

    await new Promise((r) => setTimeout(r, 50));

    expect(capturedBatch).not.toBeNull();
    expect(capturedBatch!.files).toHaveLength(15);
    expect(capturedBatch!.isAvalanche).toBe(true);
  });

  it('Debouncer clear resets pending files and cancels scheduled timers', async () => {
    const debouncer = new Debouncer({ debounceMs: 50 });
    let called = false;

    debouncer.setCallback(() => {
      called = true;
    });

    debouncer.push('src/index.ts');
    expect(debouncer.pendingCount).toBe(1);

    debouncer.clear();
    expect(debouncer.pendingCount).toBe(0);

    await new Promise((r) => setTimeout(r, 100));
    expect(called).toBe(false);
  });
});

