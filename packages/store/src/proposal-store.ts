import fs from 'node:fs';
import path from 'node:path';
import type { AstPatchProposal, PatchProposalStatus } from '@seo-partner/core';

export class ProposalStore {
  private proposalsDir: string;

  constructor(projectRoot: string) {
    this.proposalsDir = path.join(projectRoot, '.seo', 'proposals');
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.proposalsDir)) {
      fs.mkdirSync(this.proposalsDir, { recursive: true });
    }
  }

  public async saveProposal(proposal: AstPatchProposal): Promise<string> {
    this.ensureDir();
    const filePath = path.join(this.proposalsDir, `${proposal.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(proposal, null, 2), 'utf-8');
    return filePath;
  }

  public async getProposal(id: string): Promise<AstPatchProposal | null> {
    const filePath = path.join(this.proposalsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as AstPatchProposal;
  }

  public async listProposals(): Promise<AstPatchProposal[]> {
    if (!fs.existsSync(this.proposalsDir)) {
      return [];
    }
    const files = fs.readdirSync(this.proposalsDir).filter((f) => f.endsWith('.json'));
    const proposals: AstPatchProposal[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(this.proposalsDir, file), 'utf-8');
        proposals.push(JSON.parse(raw) as AstPatchProposal);
      } catch {
        // Ignore unparseable proposal files
      }
    }
    return proposals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async updateProposalStatus(id: string, status: PatchProposalStatus): Promise<boolean> {
    const proposal = await this.getProposal(id);
    if (!proposal) {
      return false;
    }
    proposal.status = status;
    if (status === 'applied') {
      proposal.appliedAt = new Date().toISOString();
    }
    await this.saveProposal(proposal);
    return true;
  }

  public async deleteProposal(id: string): Promise<boolean> {
    const filePath = path.join(this.proposalsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

