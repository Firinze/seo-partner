import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { runCiCommand } from '../../packages/cli/src/commands/ci.js';
import { runPrCommand } from '../../packages/cli/src/commands/pr.js';
import { WatchEngine } from '../../packages/tools/src/engine/watch-engine.js';

describe('Milestone v0.7: Full Lifecycle E2E Integration Suite', () => {
  let tempRepo: string;

  beforeEach(() => {
    tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-v07-e2e-'));
    execSync('git init -b main', { cwd: tempRepo, stdio: 'ignore' });
    execSync('git config user.name "Test Committer"', { cwd: tempRepo, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempRepo, stdio: 'ignore' });

    // Seed fixture with a robots blocking issue and html content
    const robotsFile = path.join(tempRepo, 'robots.txt');
    fs.writeFileSync(robotsFile, 'User-agent: *\nDisallow: /\n');

    const htmlFile = path.join(tempRepo, 'index.html');
    fs.writeFileSync(
      htmlFile,
      '<!DOCTYPE html><html><head><title>Test Page</title><meta name="description" content="Test description"></head><body><h1>Hello</h1></body></html>',
    );

    execSync('git add . && git commit -m "initial commit"', { cwd: tempRepo, stdio: 'ignore' });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('verifies CI evaluation and SARIF export under blocking F-R3 conditions', async () => {
    const sarifOut = path.join(tempRepo, 'results.sarif');

    const ciResult = await runCiCommand({
      projectRoot: tempRepo,
      failOnBlockers: true,
      format: 'sarif',
      output: 'results.sarif',
      json: true,
    });

    // robots.txt Disallow: / triggers R-TECH-01 which blocks indexing (F-R3)
    expect(ciResult.blockingIndexingCount).toBeGreaterThan(0);
    expect(ciResult.passed).toBe(false);
    expect(ciResult.exitCode).toBe(1);

    // SARIF file should be written and valid
    expect(fs.existsSync(sarifOut)).toBe(true);
    const sarifJson = JSON.parse(fs.readFileSync(sarifOut, 'utf-8'));
    expect(sarifJson.version).toBe('2.1.0');
    expect(sarifJson.runs[0].results.length).toBeGreaterThan(0);

    // Markdown summary should have 0 emoji
    expect(ciResult.markdownSummary).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });

  it('verifies automated PR proposal engine in dry-run mode', async () => {
    const proposal = await runPrCommand({
      projectRoot: tempRepo,
      branch: 'fix/e2e-remediations',
      force: true,
      dryRun: true,
      json: true,
    });

    expect(proposal.branchName).toBe('fix/e2e-remediations');
    expect(proposal.bodyMarkdown).toContain('# Pull Request: Automated SEO Remediations');
    expect(proposal.bodyMarkdown).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });

  it('verifies WatchEngine lifecycle instantiation and teardown', async () => {
    let callbackFired = false;
    const engine = new WatchEngine({
      projectRoot: tempRepo,
      debounceMs: 50,
      onEvent: () => {
        callbackFired = true;
      },
    });

    await engine.start();
    expect(engine.active).toBe(true);

    // Modify file
    fs.appendFileSync(path.join(tempRepo, 'index.html'), '<!-- comment -->');

    await new Promise((r) => setTimeout(r, 150));
    engine.stop();
    expect(engine.active).toBe(false);
  });
});
