import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  runAuditCommand,
  runDoctorCommand,
  runInitCommand,
  runReportCommand,
  runScanCommand,
} from 'seo-partner';

describe('US1: End-to-End Installation-to-Report Performance Benchmark (< 10 min)', () => {
  let projectRoot = '';

  beforeAll(async () => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-install-bench-'));

    // Create a realistic sample project structure
    fs.writeFileSync(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({
        name: 'e2e-bench-app',
        version: '1.0.0',
        dependencies: { next: '^14.2.0', react: '^18.3.0' },
      }),
      'utf-8',
    );

    const appDir = path.join(projectRoot, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(
      path.join(appDir, 'layout.tsx'),
      'export const metadata = { title: "E2E Bench App", description: "Benchmarking install to first report speed." };\nexport default function Root({ children }: { children: any }) { return <html><body>{children}</body></html>; }',
      'utf-8',
    );
    fs.writeFileSync(
      path.join(appDir, 'page.tsx'),
      'export default function Home() { return <main><h1>Enterprise Benchmarking</h1></main>; }',
      'utf-8',
    );
  });

  afterAll(async () => {
    if (projectRoot && fs.existsSync(projectRoot)) {
      await fs.promises.rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('completes the entire init -> doctor -> scan -> audit -> report cycle in well under 10 minutes (600,000 ms)', async () => {
    const startTime = performance.now();

    // 1. Initialise seo-partner configuration
    const initRes = await runInitCommand({ projectRoot });
    expect(initRes.createdFiles.length).toBeGreaterThanOrEqual(1);

    // 2. Run system doctor diagnostic
    const doctorRes = await runDoctorCommand({ projectRoot });
    expect(doctorRes.checks.length).toBeGreaterThanOrEqual(1);

    // 3. Scan codebase and index routes
    const scanRes = await runScanCommand({ projectRoot });
    expect(scanRes.filesScanned).toBeGreaterThanOrEqual(2);
    expect(scanRes.routesDiscovered).toBeGreaterThanOrEqual(1);

    // 4. Audit rules
    const auditRes = await runAuditCommand({ projectRoot });
    expect(auditRes.activeRulesCount).toBe(44);
    expect(auditRes.findings).toBeDefined();

    // 5. Generate final report
    const reportRes = await runReportCommand({
      projectRoot,
      format: 'md',
      reportType: 'audit-complet',
    });
    expect(reportRes.filePath).toBeDefined();
    expect(fs.existsSync(reportRes.filePath)).toBe(true);
    const content = fs.readFileSync(reportRes.filePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);

    const elapsedMs = performance.now() - startTime;

    // Requirement FR-001 & SC-001: strictly less than 10 minutes (600,000 ms)
    expect(elapsedMs).toBeLessThan(600000);
    // In practice on local modern SSD/CPU, this full lifecycle should easily finish in under 30 seconds
    expect(elapsedMs).toBeLessThan(30000);
  });
});
