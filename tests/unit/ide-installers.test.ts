import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { VALID_IDE_TARGETS } from '@seo-partner/core';
import {
  runDoctorCommand,
  runInitCommand,
  runUninstallCommand,
} from 'seo-partner';

const tempDirs: string[] = [];

function createTempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-ide-test-'));
  tempDirs.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'sample-host', version: '1.0.0' }),
    'utf-8',
  );
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d && fs.existsSync(d)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  }
});

describe('US1: Multi-IDE Installers, init, doctor, and uninstall', () => {
  for (const target of VALID_IDE_TARGETS) {
    it(`installs skill pack (11/11 references), secures .gitignore, and passes doctor for target "${target}" without requiring PATH binary`, () => {
      const root = createTempProject();

      const initRes = runInitCommand({
        projectRoot: root,
        ide: target,
        lang: 'fr',
        ignoreAgentTools: true,
      });

      expect(initRes.ideTargets).toEqual([target]);
      expect(initRes.lang).toBe('fr');
      expect(initRes.gitignoreUpdated).toBe(true);
      expect(fs.existsSync(path.join(root, '.seo', 'config.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, '.seo', 'decisions.md'))).toBe(true);

      const doctorRes = runDoctorCommand({ projectRoot: root });
      expect(doctorRes.healthy).toBe(true);
      for (const check of doctorRes.checks) {
        expect(check.status).toBe('ok');
      }

      const uninstallRes = runUninstallCommand({
        projectRoot: root,
        purgeData: true,
      });
      expect(uninstallRes.removedPaths.length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(root, '.seo'))).toBe(false);
    });
  }

  it('supports --dry-run without writing any files to disk', () => {
    const root = createTempProject();
    const res = runInitCommand({
      projectRoot: root,
      ide: 'agy',
      lang: 'en',
      dryRun: true,
    });

    expect(res.dryRun).toBe(true);
    expect(res.createdFiles.length).toBeGreaterThan(10);
    expect(fs.existsSync(path.join(root, '.seo'))).toBe(false);
    expect(fs.existsSync(path.join(root, '.agents'))).toBe(false);
  });

  it('auto-detects existing .cursor or .claude workspace directories when --ide is omitted', () => {
    const root = createTempProject();
    fs.mkdirSync(path.join(root, '.cursor'), { recursive: true });

    // Temporarily clear active IDE env to test directory-based detection fallback
    const savedEnv = { ...process.env };
    for (const k of Object.keys(process.env)) {
      if (k.toLowerCase().startsWith('antigravity_') || k.toLowerCase().startsWith('agy_')) {
        delete process.env[k];
      }
    }

    try {
      const res = runInitCommand({ projectRoot: root, lang: 'en' });
      expect(res.ideTargets).toContain('cursor');
      expect(
        fs.existsSync(path.join(root, '.cursor', 'skills', 'seo-partner', 'SKILL.md')),
      ).toBe(true);
    } finally {
      process.env = savedEnv;
    }
  });

  it('defaults to French (lang: fr) when lang is omitted', () => {
    const root = createTempProject();
    const res = runInitCommand({ projectRoot: root, ide: 'agy' });
    expect(res.lang).toBe('fr');
    expect(
      fs.existsSync(path.join(root, '.agents', 'skills', 'seo-partner', 'SKILL.md')),
    ).toBe(true);
  });

  it('prioritizes Antigravity active environment over loose CLAUDE.md documentation file', () => {
    const root = createTempProject();
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# Claude Instructions', 'utf-8');

    // Simulate Antigravity terminal environment
    const prevAgy = process.env.ANTIGRAVITY_AGENT;
    process.env.ANTIGRAVITY_AGENT = '1';

    try {
      const res = runInitCommand({ projectRoot: root, lang: 'en' });
      expect(res.ideTargets).toContain('agy');
      expect(res.ideTargets).not.toContain('claude');
      expect(
        fs.existsSync(path.join(root, '.agents', 'skills', 'seo-partner', 'SKILL.md')),
      ).toBe(true);
    } finally {
      if (prevAgy === undefined) {
        delete process.env.ANTIGRAVITY_AGENT;
      } else {
        process.env.ANTIGRAVITY_AGENT = prevAgy;
      }
    }
  });

  it('generates MCP config using npx -y without requiring global installation', () => {
    const root = createTempProject();
    const res = runInitCommand({ projectRoot: root, ide: 'agy', withMcp: true, lang: 'en' });
    expect(res.mcpSnippets).toBeDefined();
    const agySnippet = res.mcpSnippets?.find((s) => s.ide === 'agy');
    expect(agySnippet).toBeDefined();
    expect(agySnippet?.content).toContain('"command": "npx"');
    expect(agySnippet?.content).toContain('"args": [');
    expect(agySnippet?.content).toContain('"-y"');
  });
});

