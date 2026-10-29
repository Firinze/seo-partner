import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Official GitHub Action Packaging (Integration)', () => {
  it('should validate root action.yml composite manifest', () => {
    const actionPath = path.resolve(process.cwd(), 'action.yml');
    expect(fs.existsSync(actionPath)).toBe(true);

    const content = fs.readFileSync(actionPath, 'utf-8');
    expect(content).toContain("using: 'composite'");
    expect(content).toContain('fail-on-blockers');
    expect(content).toContain('max-critical');
    expect(content).toContain('upload-sarif');
    expect(content).toContain('github/codeql-action/upload-sarif@v3');

    // Ensure strictly zero emojis in action.yml
    expect(content).not.toMatch(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
  });

  it('should validate sample CI workflow file', () => {
    const workflowPath = path.resolve(process.cwd(), '.github/workflows/seo-audit.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);

    const content = fs.readFileSync(workflowPath, 'utf-8');
    expect(content).toContain('uses: ./');
    expect(content).toContain('fail-on-blockers');
  });
});

