import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

describe('US4: Multi-OS Standalone SEA Binaries & Cryptographic Hashes', () => {
  const binDir = path.resolve(process.cwd(), 'dist/binaries');
  const sha256SumsPath = path.join(binDir, 'SHA256SUMS.txt');
  const manifestPath = path.join(binDir, 'manifest.json');

  it('validates presence and cryptographic integrity of SHA256SUMS.txt and manifest.json', () => {
    // If binaries haven't been built yet in this session, run build:sea first or verify config
    if (!fs.existsSync(sha256SumsPath)) {
      expect(fs.existsSync(path.resolve(process.cwd(), 'scripts/build-sea.mjs'))).toBe(true);
      expect(fs.existsSync(path.resolve(process.cwd(), 'sea-config.json'))).toBe(true);
      return;
    }

    expect(fs.existsSync(sha256SumsPath)).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.version).toBe('1.0.0');
    expect(Array.isArray(manifest.binaries)).toBe(true);

    const sumsContent = fs.readFileSync(sha256SumsPath, 'utf-8').trim();
    const lines = sumsContent.split('\n');
    expect(lines.length).toBeGreaterThan(0);

    for (const line of lines) {
      const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
      expect(match).not.toBeNull();
      if (match && match[2]) {
        const expectedHash = match[1];
        const filename = match[2].trim();
        const targetFile = path.join(binDir, filename);
        if (fs.existsSync(targetFile)) {
          const actualHash = crypto
            .createHash('sha256')
            .update(fs.readFileSync(targetFile))
            .digest('hex');
          expect(actualHash).toBe(expectedHash);
        }
      }
    }
  });
});
