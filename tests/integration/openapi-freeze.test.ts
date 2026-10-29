import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLocalApiApp, type LocalApiApp } from '@seo-partner/server';

describe('US3: OpenAPI 3.1.0 Frozen Contract & RFC 9457 Compliance', () => {
  let projectRoot = '';
  let app: LocalApiApp;

  beforeAll(async () => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-openapi-freeze-'));
    fs.writeFileSync(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({ name: 'openapi-test', version: '1.0.0' }),
      'utf-8',
    );
    app = createLocalApiApp({ projectRoot, port: 4321 });
  });

  afterAll(async () => {
    if (projectRoot && fs.existsSync(projectRoot)) {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('serves a valid frozen OpenAPI 3.1.0 specification with version 1.0.0', async () => {
    const res = await app.request('/api/v1/openapi.json');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    const spec = body.data;
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toBe('seo-partner Local REST API');
    expect(spec.info.version).toBe('1.0.0');

    // Verify key frozen paths are documented
    const paths = Object.keys(spec.paths);
    expect(paths).toContain('/api/v1/overview');
    expect(paths).toContain('/api/v1/routes');
    expect(paths).toContain('/api/v1/findings');
    expect(paths).toContain('/api/v1/backlog');
    expect(paths).toContain('/api/v1/scan');
    expect(paths).toContain('/api/v1/audit');
    expect(paths).toContain('/api/v1/crawls');
    expect(paths).toContain('/api/v1/watch');
    expect(paths).toContain('/api/v1/gsc/performance');
    expect(paths).toContain('/api/v1/cwv');
    expect(paths).toContain('/api/v1/agent/run');
    expect(paths).toContain('/api/v1/bing/performance');
  });

  it('returns RFC 9457 Problem Details content-type and payload structure on 404', async () => {
    const res = await app.request('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });
});
