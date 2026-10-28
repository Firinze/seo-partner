import fs from 'node:fs';
import path from 'node:path';
import type { PrOptions, PrProposal } from '@seo-partner/core';
import { proposePatches, applyPatchBatch } from '../patch/patch-engine.js';
import {
  isGitTreeClean,
  getCurrentBranchName,
  createGitBranch,
  commitChanges,
  invokeGhPrCreate,
} from './pr-git.js';

export { isGitTreeClean, getCurrentBranchName, createGitBranch, commitChanges, invokeGhPrCreate };

export interface RunPrProposalEngineOptions extends PrOptions {
  readonly projectRoot: string;
}

export function generatePrBodyMarkdown(proposal: {
  readonly branchName: string;
  readonly baseBranch: string;
  readonly filesModified: readonly string[];
  readonly rulesRemediated: readonly string[];
  readonly averageIceScore: number;
  readonly patchesAppliedCount: number;
}): string {
  const lines: string[] = [];
  lines.push('# Pull Request: Automated SEO Remediations');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Base branch: \`${proposal.baseBranch}\``);
  lines.push(`- Remediations branch: \`${proposal.branchName}\``);
  lines.push(`- Total patches applied: ${proposal.patchesAppliedCount}`);
  lines.push(`- Average ICE impact score: ${proposal.averageIceScore.toFixed(1)}/100`);
  lines.push('');
  lines.push('## Remediated Rules');
  lines.push('');
  if (proposal.rulesRemediated.length === 0) {
    lines.push('- No automated rules required remediation.');
  } else {
    for (const rule of proposal.rulesRemediated) {
      lines.push(`- \`${rule}\``);
    }
  }
  lines.push('');
  lines.push('## Modified Files');
  lines.push('');
  if (proposal.filesModified.length === 0) {
    lines.push('- No files modified.');
  } else {
    for (const file of proposal.filesModified) {
      lines.push(`- \`${file}\``);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('*Generated automatically by seo-partner PR engine (Constitutional Principle II: static AST analysis, zero target code execution).*');
  lines.push('');

  return lines.join('\n');
}

export async function runPrProposalEngine(
  options: RunPrProposalEngineOptions,
): Promise<PrProposal> {
  const projectRoot = path.resolve(options.projectRoot);
  const isClean = isGitTreeClean(projectRoot);

  if (!isClean && !options.force) {
    throw new Error('git-dirty: work tree has uncommitted changes. Stash or commit them before running PR bot.');
  }

  const baseBranch = options.base ?? getCurrentBranchName(projectRoot);
  const branchName = options.branch ?? 'fix/seo-remediations';
  const title = options.title ?? 'fix(seo): apply automated SEO remediations';

  // Generate patch batch
  const batchResult = await proposePatches({ projectRoot });

  const rulesSet = new Set<string>();
  let totalScore = 0;
  let scoreCount = 0;

  for (const proposal of batchResult.proposals) {
    if (proposal.ruleId) {
      rulesSet.add(proposal.ruleId);
    }
  }

  // Retrieve finding details from DB to calculate average ICE score if available
  try {
    const { SeoDatabase, FindingRepository } = await import('@seo-partner/store');
    const store = SeoDatabase.open(projectRoot);
    try {
      const repo = new FindingRepository(store);
      const allFindings = repo.listFindings({ includeResolved: true });
      const findingMap = new Map(allFindings.map((f) => [f.id, f]));
      for (const proposal of batchResult.proposals) {
        const finding = findingMap.get(proposal.findingId);
        if (finding?.ice?.score) {
          totalScore += finding.ice.score;
          scoreCount++;
        }
      }
    } finally {
      store.close();
    }
  } catch {
    // If DB is not available or closed, default ICE score calculation
  }

  const rulesRemediated = Array.from(rulesSet);
  const averageIceScore = scoreCount > 0 ? totalScore / scoreCount : 0;
  const filesModified = Array.from(new Set(batchResult.proposals.map((p) => p.filePath)));
  const patchesAppliedCount = batchResult.proposals.length;

  const bodyMarkdown = generatePrBodyMarkdown({
    branchName,
    baseBranch,
    filesModified,
    rulesRemediated,
    averageIceScore,
    patchesAppliedCount,
  });

  let publishedUrl: string | undefined;

  if (!options.dryRun) {
    createGitBranch(projectRoot, branchName);

    if (patchesAppliedCount > 0) {
      await applyPatchBatch(projectRoot, batchResult, { force: options.force });
    }

    const seoDir = path.join(projectRoot, '.seo');
    if (!fs.existsSync(seoDir)) {
      fs.mkdirSync(seoDir, { recursive: true });
    }
    const prBodyFile = path.join(seoDir, 'pr-body.md');
    fs.writeFileSync(prBodyFile, bodyMarkdown, 'utf-8');

    commitChanges(projectRoot, title);

    if (options.publish) {
      const url = invokeGhPrCreate(projectRoot, {
        baseBranch,
        headBranch: branchName,
        bodyFile: prBodyFile,
        title,
      });
      if (url) {
        publishedUrl = url;
      }
    }
  }

  return {
    branchName,
    baseBranch,
    title,
    bodyMarkdown,
    patchesAppliedCount,
    filesModified,
    rulesRemediated,
    averageIceScore,
    publishedUrl,
  };
}
