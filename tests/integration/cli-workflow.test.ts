import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { executeCli } from 'seo-partner';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d && fs.existsSync(d)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  }
});

describe('US1–US4: End-to-End CLI Workflow Integration', () => {
  it('executes init -> doctor -> scan -> audit -> backlog -> report -> memory -> uninstall with JSON envelope', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-e2e-'));
    tempDirs.push(tempRoot);

    // Copy nextjs-app-sample into tempRoot (excluding any leftover .seo dir)
    const srcFixture = path.resolve('tests/fixtures/nextjs-app-sample');
    if (fs.existsSync(path.join(srcFixture, '.seo'))) {
      fs.rmSync(path.join(srcFixture, '.seo'), { recursive: true, force: true });
    }
    fs.cpSync(srcFixture, tempRoot, {
      recursive: true,
    });

    // 1. init
    const initRes = await executeCli([
      'init',
      '--cwd',
      tempRoot,
      '--here',
      '--ide',
      'agy',
      '--lang',
      'fr',
      '--ignore-agent-tools',
      '--json',
    ]);
    expect(initRes.exitCode).toBe(0);
    const initPayload = JSON.parse(initRes.stdout);
    expect(initPayload.success).toBe(true);
    expect(initPayload.data.lang).toBe('fr');

    // 2. doctor
    const docRes = await executeCli(['doctor', '--cwd', tempRoot, '--json']);
    expect(docRes.exitCode).toBe(0);
    const docPayload = JSON.parse(docRes.stdout);
    expect(docPayload.data.healthy).toBe(true);

    // 3. scan
    const scanRes = await executeCli(['scan', '--cwd', tempRoot, '--json']);
    expect(scanRes.exitCode).toBe(0);
    const scanPayload = JSON.parse(scanRes.stdout);
    expect(scanPayload.data.routesDiscovered).toBe(4);

    // 4. audit
    const auditRes = await executeCli(['audit', '--cwd', tempRoot, '--json']);
    expect(auditRes.exitCode).toBe(0);
    const auditPayload = JSON.parse(auditRes.stdout);
    expect(auditPayload.data.totalFindings).toBeGreaterThan(5);

    // 5. backlog
    const backlogRes = await executeCli(['backlog', '--cwd', tempRoot, '--json']);
    expect(backlogRes.exitCode).toBe(0);
    const backlogPayload = JSON.parse(backlogRes.stdout);
    expect(backlogPayload.data.actions[0].blocksIndexing).toBe(true);

    // 6. report
    const reportRes = await executeCli([
      'report',
      '--cwd',
      tempRoot,
      '--type',
      'audit-complet',
      '--json',
    ]);
    expect(reportRes.exitCode).toBe(0);
    const reportPayload = JSON.parse(reportRes.stdout);
    expect(fs.existsSync(reportPayload.data.filePath)).toBe(true);
    const reportMd = fs.readFileSync(reportPayload.data.filePath, 'utf-8');
    expect(reportMd).toContain('## 1. Résumé décisionnel');
    expect(reportMd).toContain('## 2. Constats avec preuves');
    expect(reportMd).toContain('## 3. Actions priorisées (Score ICE)');
    expect(reportMd).toContain('## 4. Impact attendu');
    expect(reportMd).toContain('## 5. Suivi');

    // 7. memory add & list
    const memAdd = await executeCli([
      'memory',
      'add',
      '--cwd',
      tempRoot,
      '--title',
      'Retirer /dashboard du sitemap',
      '--rationale',
      'Page authentifiee',
      '--offline',
      '--json',
    ]);
    expect(memAdd.exitCode).toBe(0);

    const memList = await executeCli([
      'memory',
      'list',
      '--cwd',
      tempRoot,
      '--offline',
      '--json',
    ]);
    expect(memList.exitCode).toBe(0);
    const memPayload = JSON.parse(memList.stdout);
    expect(memPayload.data.decisions).toHaveLength(1);

    // 8. uninstall
    const unRes = await executeCli([
      'uninstall',
      '--cwd',
      tempRoot,
      '--purge-data',
      '--json',
    ]);
    expect(unRes.exitCode).toBe(0);
  });
});

