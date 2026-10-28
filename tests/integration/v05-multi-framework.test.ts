import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { executeCli } from 'seo-partner';

describe('Milestone v0.5 Multi-Framework Integration Suite', () => {
  const tempDirs: string[] = [];

  function cloneFixtureToTemp(fixtureRelPath: string): string {
    const src = path.resolve(fixtureRelPath);
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-v05-int-'));
    tempDirs.push(dest);
    fs.cpSync(src, dest, { recursive: true });
    return dest;
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      const d = tempDirs.pop();
      if (d && fs.existsSync(d)) {
        fs.rmSync(d, { recursive: true, force: true });
      }
    }
  });

  it('scans Astro fixture, discovers routes and verifies metadata', async () => {
    const astroDir = cloneFixtureToTemp('tests/fixtures/astro-sample');
    const scanRes = await executeCli(['scan', '--cwd', astroDir, '--json']);
    expect(scanRes.exitCode).toBe(0);

    const payload = JSON.parse(scanRes.stdout);
    expect(payload.success).toBe(true);
    expect(payload.data.frameworks).toContain('astro');
    expect(payload.data.routesDiscovered).toBeGreaterThanOrEqual(3);
  });

  it('scans Nuxt 3 fixture, discovers routes and verifies metadata', async () => {
    const nuxtDir = cloneFixtureToTemp('tests/fixtures/nuxt-sample');
    const scanRes = await executeCli(['scan', '--cwd', nuxtDir, '--json']);
    expect(scanRes.exitCode).toBe(0);

    const payload = JSON.parse(scanRes.stdout);
    expect(payload.success).toBe(true);
    expect(payload.data.frameworks).toContain('nuxt');
    expect(payload.data.routesDiscovered).toBeGreaterThanOrEqual(3);
  });

  it('scans SvelteKit fixture, discovers routes and verifies metadata', async () => {
    const svelteDir = cloneFixtureToTemp('tests/fixtures/sveltekit-sample');
    const scanRes = await executeCli(['scan', '--cwd', svelteDir, '--json']);
    expect(scanRes.exitCode).toBe(0);

    const payload = JSON.parse(scanRes.stdout);
    expect(payload.success).toBe(true);
    expect(payload.data.frameworks).toContain('sveltekit');
    expect(payload.data.routesDiscovered).toBeGreaterThanOrEqual(3);
  });

  it('scans Remix / React Router v7 fixture, discovers flat routes and verifies metadata', async () => {
    const remixDir = cloneFixtureToTemp('tests/fixtures/remix-sample');
    const scanRes = await executeCli(['scan', '--cwd', remixDir, '--json']);
    expect(scanRes.exitCode).toBe(0);

    const payload = JSON.parse(scanRes.stdout);
    expect(payload.success).toBe(true);
    expect(payload.data.frameworks).toContain('remix');
    expect(payload.data.routesDiscovered).toBeGreaterThanOrEqual(3);
  });

  it('scans Django fixture with zero Python execution, audits and proposes native template patch', async () => {
    const djangoDir = cloneFixtureToTemp('tests/fixtures/django-sample');

    // 1. Scan
    const scanRes = await executeCli(['scan', '--cwd', djangoDir, '--json']);
    expect(scanRes.exitCode).toBe(0);

    const scanPayload = JSON.parse(scanRes.stdout);
    expect(scanPayload.success).toBe(true);
    expect(scanPayload.data.frameworks).toContain('django');
    expect(scanPayload.data.routesDiscovered).toBeGreaterThanOrEqual(3);

    // 2. Audit
    const auditRes = await executeCli(['audit', '--cwd', djangoDir, '--json']);
    expect(auditRes.exitCode).toBe(0);
    const auditPayload = JSON.parse(auditRes.stdout);
    expect(auditPayload.success).toBe(true);

    // 3. Propose patch (dry run)
    const patchRes = await executeCli(['patch', '--cwd', djangoDir, '--dry-run', '--json']);
    expect(patchRes.exitCode).toBe(0);
    const patchPayload = JSON.parse(patchRes.stdout);
    expect(patchPayload.success).toBe(true);
  });
});

