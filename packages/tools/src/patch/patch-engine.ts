import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  ApplyRefusal,
  Finding,
  PatchBatchResult,
  PatchProposal,
  PatchSkipped,
  SupportedLanguage,
} from '@seo-partner/core';
import { FindingRepository, SeoDatabase } from '@seo-partner/store';
import { fixFinding } from './fixers.js';
import { applyUnifiedDiff } from './unified-diff.js';
import {
  atomicWrite,
  createBackup,
  getGitDirtyFiles,
  resolveSafePath,
} from './safety.js';
import { ensureIndex } from '../engine/ensure-index.js';
import { runAuditCommand } from '../engine/audit.js';

export interface ProposePatchesOptions {
  readonly projectRoot: string;
  readonly findingId?: string;
  readonly ruleId?: string;
  readonly lang?: SupportedLanguage;
}

export class ApplyRefusalError extends Error {
  public readonly refusal: ApplyRefusal;

  constructor(refusal: ApplyRefusal) {
    super(refusal.message);
    this.name = 'ApplyRefusalError';
    this.refusal = refusal;
  }
}

function computeBatchId(diffText: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const hash6 = crypto.createHash('sha256').update(diffText).digest('hex').slice(0, 6);
  return `patch_${dateStr}_${hash6}`;
}

export async function proposePatches(
  options: ProposePatchesOptions,
): Promise<PatchBatchResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const lang = options.lang ?? 'en';

  let { initialScanPerformed } = await ensureIndex(projectRoot);

  let store = SeoDatabase.open(projectRoot);
  let findingsCount = 0;
  try {
    findingsCount = new FindingRepository(store).listFindings().length;
  } finally {
    store.close();
  }

  if (findingsCount === 0) {
    await runAuditCommand({ projectRoot });
    initialScanPerformed = true;
  }

  store = SeoDatabase.open(projectRoot);
  let findings: ReadonlyArray<Finding> = [];
  try {
    const findingRepo = new FindingRepository(store);
    const all = findingRepo.listFindings();

    // Filter by findingId or ruleId if requested
    let filtered = all;
    if (options.findingId) {
      filtered = filtered.filter((f) => f.id === options.findingId);
    }
    if (options.ruleId) {
      filtered = filtered.filter((f) => f.ruleId === options.ruleId);
    }

    // Sort F-R3 index blockers first, then descending by ICE score
    findings = [...filtered].sort((a, b) => {
      if (a.blocksIndexing && !b.blocksIndexing) return -1;
      if (!a.blocksIndexing && b.blocksIndexing) return 1;
      const scoreA = a.ice ? a.ice.score : 0;
      const scoreB = b.ice ? b.ice.score : 0;
      return scoreB - scoreA;
    });
  } finally {
    store.close();
  }

  const proposals: PatchProposal[] = [];
  const skipped: PatchSkipped[] = [];
  const coveredFiles = new Set<string>();

  for (const finding of findings) {
    const res = fixFinding({ projectRoot, lang }, finding);
    if (res.ok) {
      proposals.push(res.proposal);
      coveredFiles.add(res.proposal.filePath);
    } else {
      skipped.push(res.skipped);
    }
  }

  const combinedDiff = proposals.map((p) => p.diff).join('\n');
  const batchId = computeBatchId(combinedDiff);
  const now = new Date().toISOString();

  const patchesDir = path.join(projectRoot, '.seo', 'patches');
  if (!fs.existsSync(patchesDir)) {
    fs.mkdirSync(patchesDir, { recursive: true });
  }

  const diffFileName = `${batchId}.diff`;
  const diffRelativePath = path.posix.join('.seo', 'patches', diffFileName);
  fs.writeFileSync(path.join(patchesDir, diffFileName), combinedDiff, 'utf-8');

  const todoMarkersTotal = proposals.reduce((acc, p) => acc + p.todoMarkers, 0);

  const batchResult: PatchBatchResult = {
    batchId,
    createdAt: now,
    diffPath: diffRelativePath,
    filesCovered: coveredFiles.size,
    proposals,
    skipped,
    applied: false,
    appliedAt: null,
    backupDir: null,
    todoMarkersRemaining: todoMarkersTotal,
    initialScanPerformed,
  };

  const jsonFileName = `${batchId}.json`;
  fs.writeFileSync(
    path.join(patchesDir, jsonFileName),
    JSON.stringify(batchResult, null, 2) + '\n',
    'utf-8',
  );

  return batchResult;
}

export async function applyPatchBatch(
  projectRoot: string,
  batch: PatchBatchResult,
  options?: { readonly force?: boolean },
): Promise<PatchBatchResult> {
  const resolvedRoot = path.resolve(projectRoot);

  if (batch.applied) {
    return batch;
  }

  if (batch.proposals.length === 0) {
    return {
      ...batch,
      applied: true,
      appliedAt: new Date().toISOString(),
    };
  }

  // Step 1: Resolve all paths and block unsafe paths / secrets
  const resolvedPathsByFile = new Map<string, string>();
  for (const prop of batch.proposals) {
    const safeRes = resolveSafePath(resolvedRoot, prop.filePath);
    if (!safeRes.ok || !safeRes.absolutePath) {
      const refusal: ApplyRefusal = {
        code: 'unsafe-path',
        files: [prop.filePath],
        message: safeRes.error ?? `Unsafe path in proposal: "${prop.filePath}"`,
      };
      throw new ApplyRefusalError(refusal);
    }
    resolvedPathsByFile.set(prop.filePath, safeRes.absolutePath);
  }

  // Step 2: Git dirty check (must happen before context check to guard uncommitted work)
  const relativeFiles = Array.from(resolvedPathsByFile.keys());
  const dirtyFiles = getGitDirtyFiles(resolvedRoot, relativeFiles);
  if (dirtyFiles.length > 0 && !options?.force) {
    const refusal: ApplyRefusal = {
      code: 'git-dirty',
      files: dirtyFiles,
      message: `Cannot apply patch: ${dirtyFiles.length} file(s) have uncommitted Git changes (${dirtyFiles.join(', ')}). Commit/stash your changes or re-run with --force.`,
    };
    throw new ApplyRefusalError(refusal);
  }

  // Step 3: Context verification against current file contents
  const newContentsByFile = new Map<string, string>();
  for (const prop of batch.proposals) {
    const absPath = resolvedPathsByFile.get(prop.filePath)!;
    const origContent = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf-8') : '';

    const applyRes = applyUnifiedDiff(origContent, prop.diff);
    if (!applyRes.ok) {
      const refusal: ApplyRefusal = {
        code: 'context-mismatch',
        files: [prop.filePath],
        message: `Context divergence in "${prop.filePath}": ${applyRes.error}. Re-run scan to update findings.`,
      };
      throw new ApplyRefusalError(refusal);
    }
    newContentsByFile.set(prop.filePath, applyRes.content);
  }

  // Step 4: Backup
  const backupDir = createBackup(resolvedRoot, relativeFiles);

  // Step 5: Atomic writes
  const writtenFiles: string[] = [];
  try {
    for (const [relPath, newContent] of newContentsByFile.entries()) {
      const absPath = resolvedPathsByFile.get(relPath)!;
      await atomicWrite(absPath, newContent);
      writtenFiles.push(relPath);
    }
  } catch (writeErr) {
    // Restore written files from backup
    for (const relPath of writtenFiles) {
      const backupSrc = path.join(resolvedRoot, backupDir, relPath);
      const targetDest = resolvedPathsByFile.get(relPath)!;
      if (fs.existsSync(backupSrc)) {
        fs.copyFileSync(backupSrc, targetDest);
      }
    }
    throw writeErr;
  }

  // Step 6: Count remaining TODO-SEO markers
  let todoMarkersRemaining = 0;
  for (const relPath of relativeFiles) {
    const absPath = resolvedPathsByFile.get(relPath)!;
    if (fs.existsSync(absPath)) {
      const content = fs.readFileSync(absPath, 'utf-8');
      const matches = content.match(/TODO-SEO/g);
      if (matches) {
        todoMarkersRemaining += matches.length;
      }
    }
  }

  const updatedBatch: PatchBatchResult = {
    ...batch,
    applied: true,
    appliedAt: new Date().toISOString(),
    backupDir,
    todoMarkersRemaining,
  };

  // Re-save .seo/patches/<batchId>.json
  const patchesDir = path.join(resolvedRoot, '.seo', 'patches');
  const jsonPath = path.join(patchesDir, `${batch.batchId}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(updatedBatch, null, 2) + '\n', 'utf-8');

  return updatedBatch;
}

export function listPatchBatches(projectRoot: string): ReadonlyArray<PatchBatchResult> {
  const patchesDir = path.join(path.resolve(projectRoot), '.seo', 'patches');
  if (!fs.existsSync(patchesDir)) {
    return [];
  }

  const entries = fs.readdirSync(patchesDir);
  const jsonFiles = entries.filter((f) => f.endsWith('.json'));
  const results: PatchBatchResult[] = [];

  for (const file of jsonFiles) {
    try {
      const raw = fs.readFileSync(path.join(patchesDir, file), 'utf-8');
      const parsed = JSON.parse(raw) as PatchBatchResult;
      results.push(parsed);
    } catch {
      // ignore corrupt or incomplete JSON files
    }
  }

  // Sort newest first
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPatchBatch(projectRoot: string, batchId: string): PatchBatchResult | null {
  const patchesDir = path.join(path.resolve(projectRoot), '.seo', 'patches');
  const jsonPath = path.join(patchesDir, `${batchId}.json`);
  if (!fs.existsSync(jsonPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(raw) as PatchBatchResult;
  } catch {
    return null;
  }
}
