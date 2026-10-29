import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateSbom } from '../../scripts/generate-sbom.mjs';

describe('US2: CycloneDX v1.5 SBOM Generation & Supply-Chain Compliance', () => {
  it('generates a valid CycloneDX v1.5 JSON Software Bill of Materials', () => {
    const outputPath = 'dist/sbom/cyclonedx.json';
    const result = generateSbom(process.cwd(), outputPath);

    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(result.componentsCount).toBeGreaterThanOrEqual(12);
    expect(result.specVersion).toBe('1.5');

    const raw = fs.readFileSync(result.filePath, 'utf-8');
    const sbom = JSON.parse(raw);

    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.5');
    expect(sbom.serialNumber).toMatch(/^urn:uuid:[0-9a-f-]+$/);
    expect(sbom.metadata?.component?.name).toBe('seo-partner');
    expect(Array.isArray(sbom.components)).toBe(true);
    expect(sbom.components.length).toBeGreaterThanOrEqual(12);

    const names = sbom.components.map((c: any) => c.name);
    expect(names).toContain('@seo-partner/core');
    expect(names).toContain('@seo-partner/store');
    expect(names).toContain('@seo-partner/rules');
    expect(names).toContain('seo-partner');
  });
});
