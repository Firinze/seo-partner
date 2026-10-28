import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { BinaryManifest } from '../../packages/core/src/types.js';

describe('US4: Single-Executable Applications (SEA) Packaging Pipeline', () => {
  const rootDir = process.cwd();
  const seaConfigPath = path.join(rootDir, 'sea-config.json');
  const bundlePath = path.join(rootDir, 'dist', 'sea', 'bundle.cjs');
  const blobPath = path.join(rootDir, 'dist', 'sea', 'sea-prep.blob');
  const binDir = path.join(rootDir, 'dist', 'binaries');
  const sha256SumsPath = path.join(binDir, 'SHA256SUMS');
  const manifestPath = path.join(binDir, 'manifest.json');

  it('validates sea-config.json structure and configuration', () => {
    expect(fs.existsSync(seaConfigPath)).toBe(true);
    const config = JSON.parse(fs.readFileSync(seaConfigPath, 'utf-8'));

    expect(config.main).toBe('dist/sea/bundle.cjs');
    expect(config.output).toBe('dist/sea/sea-prep.blob');
    expect(config.disableExperimentalSEAWarning).toBe(true);
  });

  it('verifies esbuild bundle and SEA preparation blob generation', () => {
    expect(fs.existsSync(bundlePath)).toBe(true);
    const bundleStat = fs.statSync(bundlePath);
    expect(bundleStat.size).toBeGreaterThan(1000);

    expect(fs.existsSync(blobPath)).toBe(true);
    const blobStat = fs.statSync(blobPath);
    expect(blobStat.size).toBeGreaterThan(100);
  });

  it('validates binary manifest and SHA-256 integrity checksums', () => {
    expect(fs.existsSync(sha256SumsPath)).toBe(true);
    const sumsContent = fs.readFileSync(sha256SumsPath, 'utf-8').trim();
    const lines = sumsContent.split('\n');
    expect(lines.length).toBeGreaterThan(0);

    for (const line of lines) {
      const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
      expect(match).not.toBeNull();
      if (match && match[2]) {
        const expectedHash = match[1];
        const filename = match[2];
        const targetFile = path.join(binDir, filename.trim());
        expect(fs.existsSync(targetFile)).toBe(true);
        const actualHash = crypto
          .createHash('sha256')
          .update(fs.readFileSync(targetFile))
          .digest('hex');
        expect(actualHash).toBe(expectedHash);
      }
    }

    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest: BinaryManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.version).toBe('0.7.0');
    expect(manifest.binaries.length).toBeGreaterThan(0);
    const primary = manifest.binaries[0]!;
    expect(primary.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(primary.sizeBytes).toBeGreaterThan(0);
  });
});
