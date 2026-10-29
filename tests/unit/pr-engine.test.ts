import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { isGitTreeClean, runPrProposalEngine } from '../../packages/tools/src/ci/pr-engine.js';

describe('US3: Automated Pull Request Engine (pr-engine.ts)', () => {
  let tempRepo: string;

  beforeEach(() => {
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-pr-test-'));
    // Initialize a temporary Git repository
    execSync('git init -b main', { cwd: tempRepo, stdio: 'ignore' });
    execSync('git config user.name "Test Committer"', { cwd: tempRepo, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempRepo, stdio: 'ignore' });

    // Initial commit
    const initialFile = path.join(tempRepo, 'index.html');
    fs.writeFileSync(initialFile, '<html><head><meta name="robots" content="noindex"></head><body><h1>Home</h1></body></html>');
    execSync('git add . && git commit -m "chore: initial commit"', { cwd: tempRepo, stdio: 'ignore' });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('detects clean vs dirty git work tree', () => {
    expect(isGitTreeClean(tempRepo)).toBe(true);

    // Modify file without committing
    fs.writeFileSync(path.join(tempRepo, 'index.html'), '<html>dirty content</html>');
    expect(isGitTreeClean(tempRepo)).toBe(false);
  });

  it('aborts PR generation when git work tree is dirty without --force', async () => {
    fs.writeFileSync(path.join(tempRepo, 'index.html'), '<html>dirty content</html>');

    await expect(
      runPrProposalEngine({
        projectRoot: tempRepo,
        branch: 'fix/seo-patches',
        force: false,
      }),
    ).rejects.toThrow(/git-dirty/i);
  });

  it('runs dry-run PR proposal without creating branch or modifying git commit', async () => {
    const proposal = await runPrProposalEngine({
      projectRoot: tempRepo,
      branch: 'fix/seo-dry-run',
      dryRun: true,
    });

    expect(proposal.branchName).toBe('fix/seo-dry-run');
    expect(proposal.bodyMarkdown).toContain('# Pull Request: Automated SEO Remediations');
    expect(proposal.bodyMarkdown).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u); // 0 emoji

    // Current branch should still be main
    const currentBranch = execSync('git branch --show-current', { cwd: tempRepo, encoding: 'utf-8' }).trim();
    expect(currentBranch).toBe('main');
  });

  it('creates branch, applies patches and writes .seo/pr-body.md in real run', async () => {
    const proposal = await runPrProposalEngine({
      projectRoot: tempRepo,
      branch: 'fix/seo-live-remediations',
      dryRun: false,
    });

    expect(proposal.branchName).toBe('fix/seo-live-remediations');
    const prBodyFile = path.join(tempRepo, '.seo', 'pr-body.md');
    expect(fs.existsSync(prBodyFile)).toBe(true);

    const bodyContent = fs.readFileSync(prBodyFile, 'utf-8');
    expect(bodyContent).toContain('Automated SEO Remediations');
    expect(bodyContent).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

    // Current branch should now be the new branch
    const currentBranch = execSync('git branch --show-current', { cwd: tempRepo, encoding: 'utf-8' }).trim();
    expect(currentBranch).toBe('fix/seo-live-remediations');
  });
});

