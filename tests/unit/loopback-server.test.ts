import { describe, it, expect } from 'vitest';
import net from 'node:net';
import { startOAuthLoopbackServer } from '../../packages/connectors/src/google/loopback-server.js';

describe('OAuth Loopback Server', () => {
  it('starts on default port 51842 when free', async () => {
    const loopback = await startOAuthLoopbackServer({ defaultPort: 51842 });
    expect(loopback.port).toBe(51842);
    expect(loopback.redirectUri).toBe('http://127.0.0.1:51842/oauth2callback');
    await loopback.close();
  });

  it('allocates a dynamic fallback port when 51842 is occupied', async () => {
    // Occupy 51842 first with a dummy TCP server
    const dummyServer = net.createServer();
    await new Promise<void>((resolve) => dummyServer.listen(51842, '127.0.0.1', () => resolve()));

    try {
      const loopback = await startOAuthLoopbackServer({ defaultPort: 51842 });
      expect(loopback.port).not.toBe(51842);
      expect(loopback.port).toBeGreaterThan(1024);
      expect(loopback.redirectUri).toBe(`http://127.0.0.1:${loopback.port}/oauth2callback`);
      await loopback.close();
    } finally {
      await new Promise<void>((resolve) => dummyServer.close(() => resolve()));
    }
  });
});

