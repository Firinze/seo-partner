import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AstPatchProposal,
  PatchProposalStatus,
} from './types/domain.js';
import type {
  PatchMetadataChange,
  DetailedAstPatchProposal,
  PatchEvaluationResult,
  IPatchProposalService,
} from './contracts/patch-proposal.contract.js';

export function computeSimpleDiff(
  filePath: string,
  original: string,
  proposed: string,
): string {
  const origLines = original.split('\n');
  const propLines = proposed.split('\n');
  const relPath = path.basename(filePath);

  const diffLines: string[] = [
    `--- a/${relPath}`,
    `+++ b/${relPath}`,
    `@@ -1,${origLines.length} +1,${propLines.length} @@`,
  ];

  // Simple diff generator
  let i = 0;
  let j = 0;
  while (i < origLines.length || j < propLines.length) {
    if (i < origLines.length && j < propLines.length && origLines[i] === propLines[j]) {
      diffLines.push(` ${origLines[i]}`);
      i++;
      j++;
    } else {
      if (i < origLines.length && (j >= propLines.length || origLines[i] !== propLines[j])) {
        diffLines.push(`-${origLines[i]}`);
        i++;
      }
      if (j < propLines.length && (i >= origLines.length || origLines[i - 1] !== propLines[j])) {
        diffLines.push(`+${propLines[j]}`);
        j++;
      }
    }
  }

  return diffLines.join('\n');
}

export class PatchProposalService implements IPatchProposalService {
  private proposals: Map<string, DetailedAstPatchProposal> = new Map();
  private proposalsDir?: string;

  constructor(projectRoot?: string) {
    if (projectRoot) {
      this.proposalsDir = path.join(projectRoot, '.seo', 'proposals');
    }
  }

  private ensureProposalsDir(): void {
    if (this.proposalsDir && !fs.existsSync(this.proposalsDir)) {
      fs.mkdirSync(this.proposalsDir, { recursive: true });
    }
  }

  public async generateProposal(
    filePath: string,
    targetMetadata: Record<string, unknown>,
  ): Promise<PatchEvaluationResult> {
    const fileExists = fs.existsSync(filePath);
    const originalContent = fileExists ? fs.readFileSync(filePath, 'utf-8') : '';

    const isClientComponent = /^\s*['"]use client['"]/m.test(originalContent);
    const hasGenerateMetadata = /\bexport\s+(async\s+)?function\s+generateMetadata\b/.test(
      originalContent,
    );

    const id = `prop_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const changes: PatchMetadataChange[] = [];

    for (const [key, val] of Object.entries(targetMetadata)) {
      if (val !== undefined && val !== null) {
        changes.push({
          field: key,
          before: null,
          after: typeof val === 'string' ? val : JSON.stringify(val),
        });
      }
    }

    if (hasGenerateMetadata || isClientComponent) {
      const reason = hasGenerateMetadata
        ? 'Présence de generateMetadata dynamique détectée'
        : 'Composant Client Next.js ("use client") détecté';

      const prompt = `Le fichier ${filePath} requiert une intervention manuelle (${reason}).
Veuillez adapter la logique pour inclure les métadonnées suivantes sans casser le comportement dynamique existant :
${JSON.stringify(targetMetadata, null, 2)}`;

      const proposal: DetailedAstPatchProposal = {
        id,
        targetFilePath: filePath,
        operationType: 'enrich_in_place',
        astNodeType: hasGenerateMetadata ? 'FunctionDeclaration' : 'ClientDirective',
        status: 'pending',
        diffOriginal: originalContent,
        diffProposed: originalContent,
        unifiedDiff: '',
        idePrompt: prompt,
        framework: 'next_app',
        metadataChanges: changes,
        createdAt: new Date().toISOString(),
      };

      this.proposals.set(id, proposal);
      this.persistProposal(proposal);

      return {
        canMergeInPlace: false,
        hasComplexDynamicLogic: true,
        proposal,
        warning: reason,
      };
    }

    // Merge metadata
    let proposedContent = originalContent;
    const metadataRegex = /(export\s+const\s+metadata(?:\s*:\s*\w+)?\s*=\s*\{)([\s\S]*?)(\};?)/m;
    const match = metadataRegex.exec(originalContent);

    if (match) {
      const prefix = match[1] ?? '';
      let body = match[2] ?? '';
      const suffix = match[3] ?? '';

      if (targetMetadata.title && !/\btitle\s*:/m.test(body)) {
        body = `\n  title: '${String(targetMetadata.title).replace(/'/g, "\\'")}',` + body;
      }
      if (targetMetadata.description && !/\bdescription\s*:/m.test(body)) {
        body = `\n  description: '${String(targetMetadata.description).replace(/'/g, "\\'")}',` + body;
      }
      if (targetMetadata.canonical && !/\balternates\s*:/m.test(body)) {
        body = body + `\n  alternates: {\n    canonical: '${String(targetMetadata.canonical)}',\n  },`;
      }

      proposedContent = originalContent.replace(metadataRegex, `${prefix}${body}\n${suffix}`);
    } else {
      const entries: string[] = [];
      if (targetMetadata.title) {
        entries.push(`  title: '${String(targetMetadata.title).replace(/'/g, "\\'")}',`);
      }
      if (targetMetadata.description) {
        entries.push(`  description: '${String(targetMetadata.description).replace(/'/g, "\\'")}',`);
      }
      if (targetMetadata.canonical) {
        entries.push(`  alternates: {\n    canonical: '${String(targetMetadata.canonical)}',\n  },`);
      }

      const metaBlock = `export const metadata = {\n${entries.join('\n')}\n};\n\n`;
      proposedContent = metaBlock + originalContent;
    }

    const unifiedDiff = computeSimpleDiff(filePath, originalContent, proposedContent);

    const idePrompt = `Intégrer les métadonnées SEO suivantes dans ${filePath} :\n` +
      `- Titre : ${targetMetadata.title ?? 'N/A'}\n` +
      `- Description : ${targetMetadata.description ?? 'N/A'}\n` +
      `- Canonique : ${targetMetadata.canonical ?? 'N/A'}\n` +
      `Conservez la structure existante du code source sans régression.`;

    const proposal: DetailedAstPatchProposal = {
      id,
      targetFilePath: filePath,
      operationType: 'enrich_in_place',
      astNodeType: 'VariableDeclaration',
      status: 'pending',
      diffOriginal: originalContent,
      diffProposed: proposedContent,
      unifiedDiff,
      idePrompt,
      framework: 'next_app',
      metadataChanges: changes,
      createdAt: new Date().toISOString(),
    };

    this.proposals.set(id, proposal);
    this.persistProposal(proposal);

    return {
      canMergeInPlace: true,
      hasComplexDynamicLogic: false,
      proposal,
    };
  }

  private persistProposal(proposal: DetailedAstPatchProposal): void {
    if (this.proposalsDir) {
      this.ensureProposalsDir();
      const targetFile = path.join(this.proposalsDir, `${proposal.id}.json`);
      fs.writeFileSync(targetFile, JSON.stringify(proposal, null, 2), 'utf-8');
    }
  }

  public async getProposal(proposalId: string): Promise<DetailedAstPatchProposal | null> {
    if (this.proposals.has(proposalId)) {
      return this.proposals.get(proposalId) ?? null;
    }
    if (this.proposalsDir) {
      const targetFile = path.join(this.proposalsDir, `${proposalId}.json`);
      if (fs.existsSync(targetFile)) {
        const raw = fs.readFileSync(targetFile, 'utf-8');
        return JSON.parse(raw) as DetailedAstPatchProposal;
      }
    }
    return null;
  }

  public async acceptProposal(proposalId: string): Promise<boolean> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      return false;
    }
    proposal.status = 'accepted';
    this.proposals.set(proposalId, proposal);
    this.persistProposal(proposal);
    return true;
  }

  public async applyProposal(
    proposalId: string,
  ): Promise<{ success: boolean; modifiedFile: string }> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposition introuvable : ${proposalId}`);
    }

    if (proposal.status !== 'accepted') {
      throw new Error(
        `Impossible d'appliquer la proposition ${proposalId} : statut '${proposal.status}' (statut 'accepted' requis)`,
      );
    }

    // Atomic write
    const dir = path.dirname(proposal.targetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tmpFile = `${proposal.targetFilePath}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, proposal.diffProposed, 'utf-8');
    fs.renameSync(tmpFile, proposal.targetFilePath);

    proposal.status = 'applied';
    proposal.appliedAt = new Date().toISOString();
    this.proposals.set(proposalId, proposal);
    this.persistProposal(proposal);

    return {
      success: true,
      modifiedFile: proposal.targetFilePath,
    };
  }
}
