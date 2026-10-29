import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateSemanticCopyTool } from '../../packages/mcp/src/tools/semantic.js';

describe('MCP generate_semantic_copy Tool', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-semantic-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validates args and generates metadata for a file without API keys', async () => {
    const pagePath = path.join(tmpDir, 'page.tsx');
    fs.writeFileSync(
      pagePath,
      `export default function Page() {\n  return <div><h1>Plateforme d'Automatisation Commerciale</h1><p>Optimisez vos processus de vente et développez votre chiffre d'affaires.</p></div>;\n}`,
      'utf-8',
    );

    const validation = generateSemanticCopyTool.validateArgs({ filePath: pagePath });
    expect(validation.ok).toBe(true);

    const result = await generateSemanticCopyTool.execute(
      { projectRoot: tmpDir, allowApply: false, lang: 'fr' },
      validation.data!,
    );

    expect(result.ok).toBe(true);
    const data = result.data as { title: string; description: string };
    expect(data.title.length).toBeGreaterThanOrEqual(45);
    expect(data.title.length).toBeLessThanOrEqual(65);
    expect(data.description.length).toBeGreaterThanOrEqual(135);
    expect(data.description.length).toBeLessThanOrEqual(160);
    expect(data.title).not.toContain('TODO-SEO');
    expect(data.description).not.toContain('TODO-SEO');
  });
});

