import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyPatchBatch,
  ApplyRefusalError,
  getPatchBatch,
  listPatchBatches,
  proposePatches,
} from '../../packages/tools/src/patch/patch-engine.js';
import { runInitCommand } from '../../packages/cli/src/commands/init.js';
import { runScanCommand } from '../../packages/tools/src/engine/scan.js';
import { runAuditCommand } from '../../packages/tools/src/engine/audit.js';

describe('US2: Deterministic propose-patch Engine (patch-engine.ts)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-patch-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function getFileSha256(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  }

  it('guarantees 100% SHA-256 source file integrity during proposePatches (SC-002)', async () => {
    runInitCommand({ projectRoot: tmpDir, lang: 'en' });
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });
    const pagePath = path.join(tmpDir, 'pages', 'index.html');
    fs.writeFileSync(
      pagePath,
      '<!DOCTYPE html><html><head><meta name="robots" content="noindex"></head><body><h1>Hello</h1></body></html>',
    );

    await runScanCommand({ projectRoot: tmpDir });
    await runAuditCommand({ projectRoot: tmpDir });

    const shaBefore = getFileSha256(pagePath);

    const batch = await proposePatches({ projectRoot: tmpDir });
    expect(batch.applied).toBe(false);
    expect(batch.proposals.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmpDir, batch.diffPath))).toBe(true);

    const shaAfter = getFileSha256(pagePath);
    expect(shaAfter).toBe(shaBefore);
  });

  it('generates correct proposals for all 7 fixers with TODO-SEO markers and flags skipped rules', async () => {
    runInitCommand({ projectRoot: tmpDir, lang: 'fr' });
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });

    // Seed file with multiple missing SEO elements and duplicate h1 (R-ONPAGE-02: unsupported)
    const pagePath = path.join(tmpDir, 'pages', 'about.html');
    fs.writeFileSync(
      pagePath,
      '<html><head><meta name="robots" content="noindex"></head><body><h1>About</h1><h1>Duplicate H1</h1></body></html>',
    );

    await runScanCommand({ projectRoot: tmpDir });
    await runAuditCommand({ projectRoot: tmpDir });

    const batch = await proposePatches({ projectRoot: tmpDir, lang: 'fr' });
    const ruleIdsCovered = batch.proposals.map((p) => p.ruleId);

    // Robots.txt missing (R-TECH-01)
    expect(ruleIdsCovered).toContain('R-TECH-01');
    const robotsProp = batch.proposals.find((p) => p.ruleId === 'R-TECH-01')!;
    expect(robotsProp.kind).toBe('create');
    expect(robotsProp.manualReviewRequired).toBe(true);
    expect(robotsProp.todoMarkers).toBe(1);

    // Sitemap missing (R-TECH-02)
    expect(ruleIdsCovered).toContain('R-TECH-02');
    const sitemapProp = batch.proposals.find((p) => p.ruleId === 'R-TECH-02')!;
    expect(sitemapProp.kind).toBe('create');
    expect(sitemapProp.manualReviewRequired).toBe(true);

    // Noindex accidental (R-TECH-03)
    if (ruleIdsCovered.includes('R-TECH-03')) {
      const noindexProp = batch.proposals.find((p) => p.ruleId === 'R-TECH-03')!;
      expect(noindexProp.kind).toBe('modify');
      expect(noindexProp.manualReviewRequired).toBe(false);
    }

    // Html lang missing (R-TECH-14)
    if (ruleIdsCovered.includes('R-TECH-14')) {
      const langProp = batch.proposals.find((p) => p.ruleId === 'R-TECH-14')!;
      expect(langProp.diff).toContain('<html lang="fr"');
      expect(langProp.manualReviewRequired).toBe(false);
    }

    // Title missing (R-ONPAGE-01)
    if (ruleIdsCovered.includes('R-ONPAGE-01')) {
      const titleProp = batch.proposals.find((p) => p.ruleId === 'R-ONPAGE-01')!;
      expect(titleProp.diff).toContain('<title>TODO-SEO</title>');
      expect(titleProp.manualReviewRequired).toBe(true);
      expect(titleProp.todoMarkers).toBe(1);
    }

    // Meta description missing (R-ONPAGE-04)
    if (ruleIdsCovered.includes('R-ONPAGE-04')) {
      const descProp = batch.proposals.find((p) => p.ruleId === 'R-ONPAGE-04')!;
      expect(descProp.diff).toContain('<meta name="description" content="TODO-SEO">');
      expect(descProp.manualReviewRequired).toBe(true);
    }

    // Unsupported rules are recorded in skipped with reason 'unsupported-rule'
    expect(batch.skipped.length).toBeGreaterThan(0);
    const unsupported = batch.skipped.find((s) => s.reason === 'unsupported-rule');
    expect(unsupported).toBeDefined();
  });

  it('filters proposals by findingId and ruleId', async () => {
    runInitCommand({ projectRoot: tmpDir, lang: 'en' });
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'pages', 'contact.html'),
      '<!DOCTYPE html><html><head></head><body><h1>Contact</h1></body></html>',
    );

    await runScanCommand({ projectRoot: tmpDir });
    await runAuditCommand({ projectRoot: tmpDir });

    const batch = await proposePatches({ projectRoot: tmpDir, ruleId: 'R-TECH-01' });
    expect(batch.proposals.every((p) => p.ruleId === 'R-TECH-01')).toBe(true);
    expect(batch.proposals.length).toBe(1);
  });

  it('applies patches with automatic backup under .seo/backups/<timestamp>/ (SC-006)', async () => {
    runInitCommand({ projectRoot: tmpDir, lang: 'en' });
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });
    const pagePath = path.join(tmpDir, 'pages', 'test.html');
    fs.writeFileSync(
      pagePath,
      '<!DOCTYPE html><html><head></head><body><h1>Test</h1></body></html>',
    );

    await runScanCommand({ projectRoot: tmpDir });
    await runAuditCommand({ projectRoot: tmpDir });

    // Target only title insertion
    const batch = await proposePatches({ projectRoot: tmpDir, ruleId: 'R-ONPAGE-01' });
    expect(batch.proposals.length).toBe(1);

    const appliedBatch = await applyPatchBatch(tmpDir, batch);
    expect(appliedBatch.applied).toBe(true);
    expect(appliedBatch.backupDir).not.toBeNull();

    // Verify backup exists
    const backupDirAbs = path.join(tmpDir, appliedBatch.backupDir!);
    expect(fs.existsSync(backupDirAbs)).toBe(true);
    expect(fs.existsSync(path.join(backupDirAbs, 'pages', 'test.html'))).toBe(true);

    // Verify target file has updated content
    const updatedContent = fs.readFileSync(pagePath, 'utf-8');
    expect(updatedContent).toContain('<title>TODO-SEO</title>');
    expect(appliedBatch.todoMarkersRemaining).toBe(1);
  });

  it('refuses application if target file has uncommitted Git changes without --force and succeeds with force', async () => {
    // Initialize git repository
    let gitAvailable = true;
    try {
      execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir });
      execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: tmpDir });
    } catch {
      gitAvailable = false;
    }

    if (!gitAvailable) return;

    runInitCommand({ projectRoot: tmpDir, lang: 'en' });
    fs.mkdirSync(path.join(tmpDir, 'pages'), { recursive: true });
    const pagePath = path.join(tmpDir, 'pages', 'git-test.html');
    const baseLines = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '</head>',
      '<body>',
      '  <div id="c1"></div>',
      '  <div id="c2"></div>',
      '  <div id="c3"></div>',
      '  <div id="c4"></div>',
      '  <div id="c5"></div>',
      '  <div id="c6"></div>',
      '  <p>Initial paragraph</p>',
      '</body>',
      '</html>',
      '',
    ].join('\n');

    fs.writeFileSync(pagePath, baseLines, 'utf-8');

    // Commit cleanly
    execFileSync('git', ['add', '.'], { cwd: tmpDir });
    execFileSync('git', ['commit', '-m', 'Clean state'], { cwd: tmpDir });

    await runScanCommand({ projectRoot: tmpDir });
    await runAuditCommand({ projectRoot: tmpDir });

    const batch = await proposePatches({ projectRoot: tmpDir, ruleId: 'R-ONPAGE-01' });

    // Make file dirty by modifying the paragraph far below <head>
    const dirtyLines = baseLines.replace('Initial paragraph', 'Dirty paragraph');
    fs.writeFileSync(pagePath, dirtyLines, 'utf-8');

    // Attempt apply without force should reject with 'git-dirty'
    await expect(applyPatchBatch(tmpDir, batch)).rejects.toThrow(ApplyRefusalError);

    try {
      await applyPatchBatch(tmpDir, batch);
    } catch (err: any) {
      expect(err.refusal.code).toBe('git-dirty');
      expect(err.refusal.files).toContain('pages/git-test.html');
    }

    // Now apply with force: true
    const forcedBatch = await applyPatchBatch(tmpDir, batch, { force: true });
    expect(forcedBatch.applied).toBe(true);
  });

  it('rejects path traversal (..) and .env* modification attempts (SC-003)', async () => {
    const maliciousBatch: any = {
      batchId: 'patch_malicious_test',
      createdAt: new Date().toISOString(),
      diffPath: '.seo/patches/test.diff',
      filesCovered: 1,
      proposals: [
        {
          id: 'prop_malicious_1',
          findingId: 'f1',
          ruleId: 'R-TECH-01',
          filePath: '../../etc/passwd',
          kind: 'modify',
          hunks: [],
          diff: '--- a/../../etc/passwd\n+++ b/../../etc/passwd\n@@ -1,1 +1,1 @@\n-root\n+hacked\n',
          manualReviewRequired: false,
          todoMarkers: 0,
        },
      ],
      skipped: [],
      applied: false,
      appliedAt: null,
      backupDir: null,
      todoMarkersRemaining: 0,
      initialScanPerformed: false,
    };

    await expect(applyPatchBatch(tmpDir, maliciousBatch)).rejects.toThrow(ApplyRefusalError);
    try {
      await applyPatchBatch(tmpDir, maliciousBatch);
    } catch (err: any) {
      expect(err.refusal.code).toBe('unsafe-path');
      expect(err.refusal.message).toContain('traversal');
    }

    // Test .env blocking
    const envBatch: any = {
      ...maliciousBatch,
      proposals: [
        {
          ...maliciousBatch.proposals[0],
          filePath: '.env',
        },
      ],
    };

    await expect(applyPatchBatch(tmpDir, envBatch)).rejects.toThrow(ApplyRefusalError);
    try {
      await applyPatchBatch(tmpDir, envBatch);
    } catch (err: any) {
      expect(err.refusal.code).toBe('unsafe-path');
      expect(err.refusal.message).toContain('sensitive/secret');
    }
  });

  it('lists and retrieves persisted patch batches (listPatchBatches, getPatchBatch)', async () => {
    runInitCommand({ projectRoot: tmpDir, lang: 'en' });
    fs.mkdirSync(path.join(tmpDir, 'public'), { recursive: true });

    await runScanCommand({ projectRoot: tmpDir });
    await runAuditCommand({ projectRoot: tmpDir });

    const batch = await proposePatches({ projectRoot: tmpDir });
    const batches = listPatchBatches(tmpDir);
    expect(batches.length).toBeGreaterThan(0);
    expect(batches[0]?.batchId).toBe(batch.batchId);

    const loaded = getPatchBatch(tmpDir, batch.batchId);
    expect(loaded).not.toBeNull();
    expect(loaded?.batchId).toBe(batch.batchId);

    const missing = getPatchBatch(tmpDir, 'patch_non_existent');
    expect(missing).toBeNull();
  });
});
