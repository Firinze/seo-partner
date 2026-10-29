import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runGscCommand } from '../../packages/cli/src/commands/gsc.js';

describe('GSC CLI Command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsc-cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reports unauthenticated status when no credentials exist', async () => {
    const result = await runGscCommand({
      projectRoot: tmpDir,
      subcommand: 'status',
    });

    expect(result.kind).toBe('status');
    if (result.kind === 'status') {
      expect(result.authenticated).toBe(false);
      expect(result.message).toContain('non connecté');
    }
  });

  it('initiates login flow and returns loopback server details', async () => {
    const result = await runGscCommand({
      projectRoot: tmpDir,
      subcommand: 'login',
      siteUrl: 'https://example.com',
    });

    expect(result.kind).toBe('login');
    if (result.kind === 'login') {
      expect(result.siteUrl).toBe('https://example.com');
      expect(result.message).toContain('Serveur d\'autorisation démarré');
    }
  });
});

