import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runScanCommand } from 'seo-partner';

describe('US1: Real-World Multi-Framework Reference Validation (Next.js, Astro, Nuxt 3, Django, Laravel)', () => {
  const fixturesBase = path.resolve(process.cwd(), 'tests/fixtures/real-world');

  it('scans real-world Next.js (App & Pages) project with zero code execution', async () => {
    const projectRoot = path.join(fixturesBase, 'nextjs');
    const result = await runScanCommand({ projectRoot, rebuild: true });

    expect(result.filesScanned).toBeGreaterThanOrEqual(5);
    expect(result.routesDiscovered).toBeGreaterThanOrEqual(3);
    expect(result.frameworks).toContain('nextjs');
    expect(result.durationMs).toBeLessThan(10000);
  });

  it('scans real-world Astro static site with content collections', async () => {
    const projectRoot = path.join(fixturesBase, 'astro');
    const result = await runScanCommand({ projectRoot, rebuild: true });

    expect(result.filesScanned).toBeGreaterThanOrEqual(4);
    expect(result.routesDiscovered).toBeGreaterThanOrEqual(2);
    expect(result.frameworks).toContain('astro');
    expect(result.durationMs).toBeLessThan(10000);
  });

  it('scans real-world Nuxt 3 project with auto-routed pages', async () => {
    const projectRoot = path.join(fixturesBase, 'nuxt');
    const result = await runScanCommand({ projectRoot, rebuild: true });

    expect(result.filesScanned).toBeGreaterThanOrEqual(4);
    expect(result.routesDiscovered).toBeGreaterThanOrEqual(2);
    expect(result.frameworks).toContain('nuxt');
    expect(result.durationMs).toBeLessThan(10000);
  });

  it('scans real-world Django project without python execution (F-S5)', async () => {
    const projectRoot = path.join(fixturesBase, 'django');
    const result = await runScanCommand({ projectRoot, rebuild: true });

    expect(result.filesScanned).toBeGreaterThanOrEqual(4);
    expect(result.routesDiscovered).toBeGreaterThanOrEqual(3);
    expect(result.frameworks).toContain('django');
    expect(result.durationMs).toBeLessThan(10000);
  });

  it('scans real-world Laravel project without php execution (F-S5)', async () => {
    const projectRoot = path.join(fixturesBase, 'laravel');
    const result = await runScanCommand({ projectRoot, rebuild: true });

    expect(result.filesScanned).toBeGreaterThanOrEqual(4);
    expect(result.routesDiscovered).toBeGreaterThanOrEqual(3);
    expect(result.frameworks).toContain('php');
    expect(result.durationMs).toBeLessThan(10000);
  });
});
