import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ensureGitignoreSecurity,
  isPathExcluded,
  loadGitignorePatterns,
} from '../../packages/core/src/gitignore-guard.js';

describe('Git Hygiene Integration Tests (US1)', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hygiene-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('ensures that after audit execution, all internal and temporary files are strictly ignored', () => {
    // 1. Initialise gitignore security guard
    ensureGitignoreSecurity(projectDir);

    const patterns = loadGitignorePatterns(projectDir);

    // 2. Simulate creating internal SEO Partner files
    const forbiddenFiles = [
      '.seo/index.db',
      '.seo/config.json',
      '.seo/decisions.md',
      '.seo/proposals/test-patch.json',
      '.seo/credentials/gsc-token.json',
      '.mcp.json',
      'seo-report.md',
      '2026-10-29-audit-complet.md',
      'audit-2026-10-29.md',
      '.agents/skills/seo/SKILL.md',
      '.cursor/rules/seo.mdc',
      'specs/010-refonte-intelligence-ia/spec.md',
    ];

    for (const relPath of forbiddenFiles) {
      const fullPath = path.join(projectDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, 'dummy content', 'utf-8');

      const check = isPathExcluded(relPath, patterns);
      expect(
        check.excluded,
        `Expected ${relPath} to be excluded by gitignore patterns: ${patterns.join(', ')}`,
      ).toBe(true);
    }
  });
});

