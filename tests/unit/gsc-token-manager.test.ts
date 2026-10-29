import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { GscTokenManager } from '../../packages/connectors/src/google/token-manager.js';

describe('GscTokenManager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsc-token-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('stores and loads token credentials cleanly in .seo/credentials/gsc.json', async () => {
    const manager = new GscTokenManager({ projectRoot: tmpDir });

    await manager.saveCredentials({
      service: 'google_search_console',
      authType: 'oauth_token',
      accessToken: 'test_access_token_123',
      refreshToken: 'test_refresh_token_456',
      expiresAt: Date.now() + 3600 * 1000,
      siteUrl: 'https://example.com',
    });

    const loaded = await manager.loadCredentials();
    expect(loaded).toBeDefined();
    expect(loaded?.accessToken).toBe('test_access_token_123');
    expect(loaded?.refreshToken).toBe('test_refresh_token_456');
    expect(loaded?.siteUrl).toBe('https://example.com');
  });

  it('refreshes expired access token using refresh_token', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new_refreshed_access_token_789',
        expires_in: 3600,
      }),
    });

    const manager = new GscTokenManager({
      projectRoot: tmpDir,
      fetchFn: fakeFetch as unknown as typeof fetch,
    });

    await manager.saveCredentials({
      service: 'google_search_console',
      authType: 'oauth_token',
      accessToken: 'expired_token',
      refreshToken: 'valid_refresh_token',
      expiresAt: Date.now() - 1000, // expired
      siteUrl: 'https://example.com',
    });

    const validToken = await manager.getValidAccessToken({
      clientId: 'dummy-client-id',
      clientSecret: 'dummy-client-secret',
    });

    expect(validToken).toBe('new_refreshed_access_token_789');
    expect(fakeFetch).toHaveBeenCalledTimes(1);

    const reloaded = await manager.loadCredentials();
    expect(reloaded?.accessToken).toBe('new_refreshed_access_token_789');
  });
});

