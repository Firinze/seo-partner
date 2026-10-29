import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generate9EliteDeliverables } from '../../packages/agent/src/elite-deliverables-builder.js';

describe('9 Elite Deliverables Generator', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elite-docs-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates the complete suite of 9 elite deliverables in docs/seo/', async () => {
    const files = await generate9EliteDeliverables({
      projectRoot: tmpDir,
      projectName: 'Plateforme FinTech',
      domain: 'https://fintech.example.com',
      framework: 'next_app',
    });

    expect(files.length).toBe(9);

    const docsSeoDir = path.join(tmpDir, 'docs', 'seo');
    expect(fs.existsSync(docsSeoDir)).toBe(true);

    const expectedFilenames = [
      '01-audit-technique.md',
      '02-architecture-information.md',
      '03-strategie-mots-cles.md',
      '04-plan-cocon-semantique.md',
      '05-briefs-redactionnels.md',
      '06-optimisation-on-page.md',
      '07-strategie-maillage-interne.md',
      '08-plan-netlinking-autorite.md',
      '09-tableau-bord-suivi-kpi.md',
    ];

    for (const name of expectedFilenames) {
      const filePath = path.join(docsSeoDir, name);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(100);
      expect(content).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u); // STRICT ZERO EMOJIS
    }
  });
});

