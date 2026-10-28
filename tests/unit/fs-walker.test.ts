import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  type ScannedFile,
  assertNetworkAllowed,
  isSecretFile,
  readOutboundLog,
  shouldExcludePath,
  walkProjectFiles,
} from '@seo-partner/core';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d && fs.existsSync(d)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  }
});

describe('US2 & SC-005: Streaming File Walker, Secret Guard & Offline Guard', () => {
  it('strictly excludes .env*, private keys, and binary files while keeping .env.example', () => {
    expect(isSecretFile('.env')).toBe(true);
    expect(isSecretFile('.env.local')).toBe(true);
    expect(isSecretFile('.env.secret')).toBe(true);
    expect(isSecretFile('certs/server.pem')).toBe(true);
    expect(isSecretFile('.env.example')).toBe(false);

    expect(shouldExcludePath('public/logo.png').reason).toBe('binary');
    expect(shouldExcludePath('node_modules/next/index.js').reason).toBe('ignored');
  });

  it('walks Next.js fixture and never reads or indexes .env.secret', async () => {
    const fixtureRoot = path.resolve('tests/fixtures/nextjs-app-sample');
    const res = await walkProjectFiles({
      projectRoot: fixtureRoot,
      projectId: 'proj_test',
    });

    const scannedPaths = res.files.map((f: ScannedFile) => f.path);
    expect(scannedPaths).not.toContain('.env.secret');
    expect(scannedPaths).toContain('src/app/page.tsx');
    expect(scannedPaths).toContain('src/app/pricing/page.tsx');
    expect(scannedPaths).toContain('public/robots.txt');
    expect(scannedPaths).toContain('public/sitemap.xml');
    expect(res.skippedSecretOrIgnoredCount).toBeGreaterThanOrEqual(1);
  });

  it('enforces --offline mode and logs blocked outbound requests', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-offline-'));
    tempDirs.push(dir);

    expect(() =>
      assertNetworkAllowed(
        dir,
        true,
        'https://status.search.google.com',
        'watch-check',
      ),
    ).toThrow(/--offline mode is active/);

    const logs = readOutboundLog(dir);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.blockedByOfflineMode).toBe(true);
    expect(logs[0]?.targetUrl).toBe('https://status.search.google.com');
  });
});

