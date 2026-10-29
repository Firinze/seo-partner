import { describe, it, expect, vi } from 'vitest';
import { AiProviderCascade } from '../../packages/agent/src/ai-provider-cascade.js';

describe('AiProviderCascade', () => {
  it('selects mcp_ide when MCP client context is present', async () => {
    const cascade = new AiProviderCascade({
      isMcpAvailable: true,
      env: {},
    });

    const channel = await cascade.resolveActiveChannel();
    expect(channel.channel).toBe('mcp_ide');
    expect(channel.isAvailable).toBe(true);
  });

  it('selects external_api when external key is provided in env', async () => {
    const cascade = new AiProviderCascade({
      isMcpAvailable: false,
      env: { OPENAI_API_KEY: 'sk-test-key' },
    });

    const channel = await cascade.resolveActiveChannel();
    expect(channel.channel).toBe('external_api');
    expect(channel.provider).toBe('openai');
    expect(channel.isAvailable).toBe(true);
  });

  it('selects opencode_local when local endpoint responds', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const cascade = new AiProviderCascade({
      isMcpAvailable: false,
      env: {},
      localCheckFetch: fakeFetch as unknown as typeof fetch,
    });

    const channel = await cascade.resolveActiveChannel();
    expect(channel.channel).toBe('opencode_local');
    expect(channel.isAvailable).toBe(true);
  });

  it('returns pedagogic refusal when no channel is available (zero TODO-SEO fallback)', async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const cascade = new AiProviderCascade({
      isMcpAvailable: false,
      env: {},
      localCheckFetch: fakeFetch as unknown as typeof fetch,
    });

    const channel = await cascade.resolveActiveChannel();
    expect(channel.channel).toBe('none');
    expect(channel.isAvailable).toBe(false);
    expect(channel.pedagogicMessage).toBeDefined();
    expect(channel.pedagogicMessage).toContain('Aucun moteur d\'intelligence artificielle disponible');
    expect(channel.pedagogicMessage).not.toContain('TODO-SEO');
  });
});

