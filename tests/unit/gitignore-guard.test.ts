import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ensureGitignoreEntries,
  REQUIRED_GITIGNORE_ENTRIES,
  isSecretFile,
  isBinaryFile,
  loadGitignorePatterns,
} from '../../packages/core/src/gitignore-guard.js';

describe('GitignoreGuard Unit Tests (US1)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-guard-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates .gitignore and appends all required entries when file does not exist', () => {
    const gitignorePath = path.join(tempDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(false);

    const result = ensureGitignoreEntries(tempDir);
    expect(result.updated).toBe(true);
    expect(result.addedEntries.length).toBe(REQUIRED_GITIGNORE_ENTRIES.length);

    const patterns = loadGitignorePatterns(tempDir);
    for (const required of REQUIRED_GITIGNORE_ENTRIES) {
      expect(patterns).toContain(required);
    }
  });

  it('does not duplicate existing entries when .gitignore already has some entries', () => {
    const gitignorePath = path.join(tempDir, '.gitignore');
    fs.writeFileSync(gitignorePath, '.seo/\nnode_modules/\n', 'utf-8');

    const result = ensureGitignoreEntries(tempDir);
    expect(result.updated).toBe(true);
    expect(result.addedEntries).not.toContain('.seo/');
    expect(result.addedEntries).toContain('.mcp.json');

    const patterns = loadGitignorePatterns(tempDir);
    const countSeo = patterns.filter((p) => p === '.seo/').length;
    expect(countSeo).toBe(1);
  });

  it('detects secret files accurately', () => {
    expect(isSecretFile('.env')).toBe(true);
    expect(isSecretFile('.env.local')).toBe(true);
    expect(isSecretFile('.env.production')).toBe(true);
    expect(isSecretFile('credentials.json')).toBe(true);
    expect(isSecretFile('client_secret_123.json')).toBe(true);
    expect(isSecretFile('id_rsa')).toBe(true);
    expect(isSecretFile('.env.example')).toBe(false);
    expect(isSecretFile('page.tsx')).toBe(false);
  });

  it('detects binary files accurately', () => {
    expect(isBinaryFile('image.png')).toBe(true);
    expect(isBinaryFile('font.woff2')).toBe(true);
    expect(isBinaryFile('database.sqlite')).toBe(true);
    expect(isBinaryFile('index.ts')).toBe(false);
    expect(isBinaryFile('styles.css')).toBe(false);
  });
});
