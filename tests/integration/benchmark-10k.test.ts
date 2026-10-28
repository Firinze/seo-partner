import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runScanCommand } from 'seo-partner';

describe('SC-002: 10,000-File Cold Scan Performance & Memory Benchmark', () => {
  let root = '';

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-partner-10k-'));

    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'bench-10k', dependencies: { next: '15.0.0' } }),
      'utf-8',
    );
    fs.mkdirSync(path.join(root, 'public'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'public', 'robots.txt'),
      'User-agent: *\nAllow: /\n',
      'utf-8',
    );
    fs.writeFileSync(
      path.join(root, 'public', 'sitemap.xml'),
      '<urlset><url><loc>https://example.com/</loc></url></urlset>',
      'utf-8',
    );

    const srcDir = path.join(root, 'src');
    for (let dirIdx = 0; dirIdx < 100; dirIdx += 1) {
      const subDir = path.join(srcDir, `mod_${dirIdx}`);
      fs.mkdirSync(subDir, { recursive: true });
      const writes: Array<Promise<void>> = [];
      for (let fileIdx = 0; fileIdx < 100; fileIdx += 1) {
        if (dirIdx < 2 && fileIdx === 0) {
          const appRouteDir = path.join(root, 'src', 'app', `section_${dirIdx}`);
          fs.mkdirSync(appRouteDir, { recursive: true });
          writes.push(
            fs.promises.writeFile(
              path.join(appRouteDir, 'page.tsx'),
              `export const metadata = { title: 'Section ${dirIdx} Title With Optimal Length For SERP Display', description: 'Description for section ${dirIdx}' };\nexport default function Page() { return <main><h1>Section ${dirIdx}</h1></main>; }\n`,
              'utf-8',
            ),
          );
        } else {
          writes.push(
            fs.promises.writeFile(
              path.join(subDir, `util_${fileIdx}.ts`),
              `export const VALUE_${dirIdx}_${fileIdx} = ${dirIdx * 100 + fileIdx};\n`,
              'utf-8',
            ),
          );
        }
      }
      await Promise.all(writes);
    }
  }, 120000);

  afterAll(async () => {
    if (root && fs.existsSync(root)) {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  }, 120000);

  it(
    'scans a generated 10,000-file repository in under 60 seconds and under 1 GB RAM',
    async () => {
      const res = await runScanCommand({ projectRoot: root });
      const memMb = process.memoryUsage().rss / (1024 * 1024);

      expect(res.filesScanned).toBeGreaterThanOrEqual(10000);
      expect(res.durationMs).toBeLessThan(60000);
      expect(memMb).toBeLessThan(1024);
    },
    60000,
  );
});
