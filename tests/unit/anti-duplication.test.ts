import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectSeoFileInventory } from '../../packages/adapters/src/index.js';

describe('Anti-Duplication & Conflict Detector (US3)', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anti-dup-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('detects conflict when both public/robots.txt and app/robots.ts exist', () => {
    fs.mkdirSync(path.join(projectDir, 'public'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'app'), { recursive: true });

    fs.writeFileSync(path.join(projectDir, 'public', 'robots.txt'), 'User-agent: *\nDisallow: /', 'utf-8');
    fs.writeFileSync(path.join(projectDir, 'app', 'robots.ts'), 'export default function robots() {}', 'utf-8');

    const inventory = detectSeoFileInventory(projectDir);
    expect(inventory.robots.hasConflict).toBe(true);
    expect(inventory.robots.appRobotsTs).toBe('app/robots.ts');
    expect(inventory.robots.publicRobotsTxt).toBe('public/robots.txt');
  });

  it('detects clean single existence of app/robots.ts without conflict', () => {
    fs.mkdirSync(path.join(projectDir, 'app'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'app', 'robots.ts'), 'export default function robots() {}', 'utf-8');

    const inventory = detectSeoFileInventory(projectDir);
    expect(inventory.robots.hasConflict).toBe(false);
    expect(inventory.robots.appRobotsTs).toBe('app/robots.ts');
    expect(inventory.robots.publicRobotsTxt).toBeUndefined();
  });

  it('detects sitemap conflict when both public/sitemap.xml and app/sitemap.ts exist', () => {
    fs.mkdirSync(path.join(projectDir, 'public'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'app'), { recursive: true });

    fs.writeFileSync(path.join(projectDir, 'public', 'sitemap.xml'), '<urlset></urlset>', 'utf-8');
    fs.writeFileSync(path.join(projectDir, 'app', 'sitemap.ts'), 'export default function sitemap() {}', 'utf-8');

    const inventory = detectSeoFileInventory(projectDir);
    expect(inventory.sitemap.hasConflict).toBe(true);
  });
});

