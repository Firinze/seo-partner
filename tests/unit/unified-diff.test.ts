import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyUnifiedDiff,
  generateUnifiedDiff,
} from '../../packages/tools/src/patch/unified-diff.js';

describe('US2: Unified Diff Generator and Verifier (unified-diff.ts)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-diff-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates and applies a valid creation diff (--- /dev/null)', () => {
    const filePath = 'public/robots.txt';
    const newContent = 'User-agent: *\nAllow: /\nSitemap: https://TODO-SEO.example/sitemap.xml\n';

    const diff = generateUnifiedDiff(filePath, '', newContent, true);
    expect(diff.diffText).toContain('--- /dev/null');
    expect(diff.diffText).toContain('+++ b/public/robots.txt');
    expect(diff.diffText).toContain('@@ -0,0 +1,4 @@');
    expect(diff.hunks.length).toBe(1);

    const applyResult = applyUnifiedDiff('', diff.diffText);
    expect(applyResult.ok).toBe(true);
    if (applyResult.ok) {
      expect(applyResult.content).toBe(newContent);
    }
  });

  it('generates standard unified diff with context lines and replays exact modifications', () => {
    const original = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '  <title>Old Title</title>',
      '  <meta charset="utf-8">',
      '</head>',
      '<body>',
      '  <h1>Welcome</h1>',
      '</body>',
      '</html>',
    ].join('\n');

    const modified = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '  <title>New Title</title>',
      '  <meta charset="utf-8">',
      '</head>',
      '<body>',
      '  <h1>Welcome</h1>',
      '</body>',
      '</html>',
    ].join('\n');

    const diff = generateUnifiedDiff('pages/home.html', original, modified, false);
    expect(diff.diffText).toContain('--- a/pages/home.html');
    expect(diff.diffText).toContain('+++ b/pages/home.html');
    expect(diff.diffText).toContain('-  <title>Old Title</title>');
    expect(diff.diffText).toContain('+  <title>New Title</title>');

    // Apply back
    const applied = applyUnifiedDiff(original, diff.diffText);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.content).toBe(modified);
    }
  });

  it('merges nearby changes into a single unified hunk when separated by <= 3 lines', () => {
    const original = [
      'line 1',
      'line 2',
      'line 3',
      'line 4 - change me',
      'line 5 - keep',
      'line 6 - change me too',
      'line 7',
      'line 8',
    ].join('\n');

    const modified = [
      'line 1',
      'line 2',
      'line 3',
      'line 4 - changed',
      'line 5 - keep',
      'line 6 - changed too',
      'line 7',
      'line 8',
    ].join('\n');

    const diff = generateUnifiedDiff('test.txt', original, modified, false);
    // Hunks should be merged since line 4 and line 6 are separated by only 1 equal line
    expect(diff.hunks.length).toBe(1);

    const applied = applyUnifiedDiff(original, diff.diffText);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.content).toBe(modified);
    }
  });

  it('rejects diff application with clear conflict details when context has diverged', () => {
    const original = [
      'line A',
      'line B',
      'target line',
      'line C',
      'line D',
    ].join('\n');

    const modified = [
      'line A',
      'line B',
      'target line replaced',
      'line C',
      'line D',
    ].join('\n');

    const diff = generateUnifiedDiff('test.txt', original, modified);

    // Apply to a diverged version where 'target line' is missing or different
    const diverged = [
      'line A',
      'line B',
      'concurrently modified line',
      'line C',
      'line D',
    ].join('\n');

    const res = applyUnifiedDiff(diverged, diff.diffText);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('mismatch');
      expect(res.line).toBeGreaterThanOrEqual(1);
    }
  });

  it('preserves Windows CRLF (\\r\\n) line endings when modifying files', () => {
    const originalCrLf = 'line 1\r\nline 2\r\nline 3\r\n';
    const modifiedCrLf = 'line 1\r\nline 2 modified\r\nline 3\r\n';

    const diff = generateUnifiedDiff('crlf.txt', originalCrLf, modifiedCrLf);
    const res = applyUnifiedDiff(originalCrLf, diff.diffText);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.content).toBe(modifiedCrLf);
      expect(res.content.includes('\r\n')).toBe(true);
    }
  });

  it('validates generated diff against git apply --check when git repository is present', () => {
    // Initialize temporary git repo
    let gitAvailable = true;
    try {
      execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir });
      execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: tmpDir });
    } catch {
      gitAvailable = false;
    }

    if (!gitAvailable) return;

    const fileRel = 'src/example.html';
    const fileAbs = path.join(tmpDir, fileRel);
    fs.mkdirSync(path.dirname(fileAbs), { recursive: true });

    const original = '<!DOCTYPE html>\n<html>\n<head>\n</head>\n<body>\n</body>\n</html>\n';
    const modified = '<!DOCTYPE html>\n<html>\n<head>\n  <title>TODO-SEO</title>\n</head>\n<body>\n</body>\n</html>\n';

    fs.writeFileSync(fileAbs, original, 'utf-8');
    execFileSync('git', ['add', '.'], { cwd: tmpDir });
    execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: tmpDir });

    const diff = generateUnifiedDiff(fileRel, original, modified);
    const patchPath = path.join(tmpDir, 'test.diff');
    fs.writeFileSync(patchPath, diff.diffText, 'utf-8');

    // Run git apply --check
    expect(() => {
      execFileSync('git', ['apply', '--check', patchPath], { cwd: tmpDir, stdio: 'pipe' });
    }).not.toThrow();
  });
});

