import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PatchProposalService } from '@seo-partner/core';

describe('PatchProposalService', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-proposal-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('proposes in-place metadata enrichment for static Next.js page', async () => {
    const service = new PatchProposalService(tmpDir);
    const pagePath = path.join(tmpDir, 'page.tsx');
    const sourceCode = `export default function Page() {\n  return <div>Accueil</div>;\n}\n`;
    fs.writeFileSync(pagePath, sourceCode, 'utf-8');

    const result = await service.generateProposal(pagePath, {
      title: 'Accueil Sécurisé - Expert',
      description: 'Découvrez notre solution experte avec accompagnement complet.',
      canonical: 'https://example.com/',
    });

    expect(result.canMergeInPlace).toBe(true);
    expect(result.hasComplexDynamicLogic).toBe(false);
    expect(result.proposal.diffProposed).toContain("title: 'Accueil Sécurisé - Expert'");
    expect(result.proposal.status).toBe('pending');
    expect(fs.readFileSync(pagePath, 'utf-8')).toBe(sourceCode); // Inviolabilite : fichier source non modifie
  });

  it('flags generateMetadata and creates an IDE agent prompt without direct modification', async () => {
    const service = new PatchProposalService(tmpDir);
    const pagePath = path.join(tmpDir, 'dynamic-page.tsx');
    const sourceCode = `export async function generateMetadata({ params }) {\n  return { title: params.slug };\n}\n`;
    fs.writeFileSync(pagePath, sourceCode, 'utf-8');

    const result = await service.generateProposal(pagePath, {
      title: 'Titre Dynamique Proposé',
      description: 'Description enrichie proposée.',
    });

    expect(result.canMergeInPlace).toBe(false);
    expect(result.hasComplexDynamicLogic).toBe(true);
    expect(result.proposal.idePrompt).toContain('generateMetadata dynamique');
    expect(fs.readFileSync(pagePath, 'utf-8')).toBe(sourceCode);
  });

  it('applies proposal only after status becomes accepted', async () => {
    const service = new PatchProposalService(tmpDir);
    const pagePath = path.join(tmpDir, 'page.tsx');
    fs.writeFileSync(pagePath, `export default function Home() { return <h1>Test</h1>; }`, 'utf-8');

    const result = await service.generateProposal(pagePath, {
      title: 'Mon Titre',
      description: 'Ma Description',
    });

    // Try applying while pending -> should throw
    await expect(service.applyProposal(result.proposal.id)).rejects.toThrow();

    // Accept proposal
    const accepted = await service.acceptProposal(result.proposal.id);
    expect(accepted).toBe(true);

    // Apply proposal
    const appliedResult = await service.applyProposal(result.proposal.id);
    expect(appliedResult.success).toBe(true);
    expect(fs.readFileSync(pagePath, 'utf-8')).toContain("title: 'Mon Titre'");
  });
});

