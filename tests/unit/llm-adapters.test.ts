import { describe, it, expect } from 'vitest';
import {
  AnthropicAdapter,
  OpenAiAdapter,
  GeminiAdapter,
  createLlmAdapter,
} from '@seo-partner/agent';

describe('AnthropicAdapter', () => {
  it('formats requests and parses tool_use response from Claude API', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = async (url: string | URL | any, init?: RequestInit): Promise<Response> => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      capturedBody = JSON.parse(String(init?.body ?? '{}'));

      const responsePayload = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Je vais analyser le site.' },
          {
            type: 'tool_use',
            id: 'call_abc',
            name: 'scan',
            input: { rebuild: true },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 150, output_tokens: 45 },
      };

      return new Response(JSON.stringify(responsePayload), { status: 200 });
    };

    const adapter = new AnthropicAdapter({
      apiKey: 'sk-ant-test-123',
      fetchFn: mockFetch as any,
    });

    const res = await adapter.complete({
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: 'You are an SEO expert.' },
        { role: 'user', content: 'Audit the project.' },
      ],
      tools: [
        {
          name: 'scan',
          description: 'Scan project routes',
          parameters: {
            type: 'object',
            properties: { rebuild: { type: 'boolean' } },
          },
        },
      ],
    });

    expect(capturedUrl).toBe('https://api.anthropic.com/v1/messages');
    expect(capturedHeaders['x-api-key']).toBe('sk-ant-test-123');
    expect(capturedBody.system).toBe('You are an SEO expert.');
    expect(capturedBody.tools).toHaveLength(1);
    expect(capturedBody.tools[0].name).toBe('scan');

    expect(res.content).toBe('Je vais analyser le site.');
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls?.[0]?.name).toBe('scan');
    expect(res.toolCalls?.[0]?.arguments).toEqual({ rebuild: true });
    expect(res.stopReason).toBe('tool_use');
    expect(res.usage?.totalTokens).toBe(195);
  });
});

describe('OpenAiAdapter', () => {
  it('formats requests and parses tool_calls response from OpenAI API', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = async (url: string | URL | any, init?: RequestInit): Promise<Response> => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      capturedBody = JSON.parse(String(init?.body ?? '{}'));

      const responsePayload = {
        id: 'chatcmpl-456',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Running audit now.',
              tool_calls: [
                {
                  id: 'call_def',
                  type: 'function',
                  function: {
                    name: 'audit',
                    arguments: '{"category":"technical"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
      };

      return new Response(JSON.stringify(responsePayload), { status: 200 });
    };

    const adapter = new OpenAiAdapter({
      apiKey: 'sk-openai-test',
      fetchFn: mockFetch as any,
    });

    const res = await adapter.complete({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Run audit' }],
      tools: [
        {
          name: 'audit',
          description: 'Run audit',
          parameters: {
            type: 'object',
            properties: { category: { type: 'string' } },
          },
        },
      ],
    });

    expect(capturedUrl).toBe('https://api.openai.com/v1/chat/completions');
    expect(capturedHeaders['authorization']).toBe('Bearer sk-openai-test');
    expect(capturedBody.tools[0].type).toBe('function');
    expect(capturedBody.tools[0].function.name).toBe('audit');

    expect(res.content).toBe('Running audit now.');
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls?.[0]?.name).toBe('audit');
    expect(res.toolCalls?.[0]?.arguments).toEqual({ category: 'technical' });
    expect(res.stopReason).toBe('tool_use');
  });
});

describe('GeminiAdapter', () => {
  it('formats requests and parses functionCall response from Gemini API', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;

    const mockFetch = async (url: string | URL | any, init?: RequestInit): Promise<Response> => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body ?? '{}'));

      const responsePayload = {
        candidates: [
          {
            content: {
              parts: [
                { text: 'Checking CWV metrics.' },
                {
                  functionCall: {
                    name: 'get_cwv_metrics',
                    args: { url: 'https://example.com/' },
                  },
                },
              ],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 25, totalTokenCount: 105 },
      };

      return new Response(JSON.stringify(responsePayload), { status: 200 });
    };

    const adapter = new GeminiAdapter({
      apiKey: 'AIzaSyTestKey',
      fetchFn: mockFetch as any,
    });

    const res = await adapter.complete({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'user', content: 'Check CWV' }],
      tools: [
        {
          name: 'get_cwv_metrics',
          description: 'Get CWV metrics',
          parameters: {
            type: 'object',
            properties: { url: { type: 'string' } },
          },
        },
      ],
    });

    expect(capturedUrl).toContain('generativelanguage.googleapis.com');
    expect(capturedUrl).toContain('key=AIzaSyTestKey');
    expect(capturedBody.tools[0].functionDeclarations[0].name).toBe('get_cwv_metrics');

    expect(res.content).toBe('Checking CWV metrics.');
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls?.[0]?.name).toBe('get_cwv_metrics');
    expect(res.toolCalls?.[0]?.arguments).toEqual({ url: 'https://example.com/' });
  });
});

describe('LLM Adapter Factory with --base-url for Local Inference', () => {
  it('creates custom OpenAI-compatible adapter when baseUrl is specified (Ollama / vLLM)', () => {
    const target = createLlmAdapter({
      baseUrl: 'http://localhost:11434/v1',
      model: 'qwen2.5-coder:7b',
    });

    expect(target.adapter.provider).toBe('custom');
    expect(target.defaultModel).toBe('qwen2.5-coder:7b');
  });

  it('selects provider from API key prefix when provider not explicitly set', () => {
    const antTarget = createLlmAdapter({ apiKey: 'sk-ant-test' });
    expect(antTarget.adapter.provider).toBe('anthropic');

    const gemTarget = createLlmAdapter({ apiKey: 'AIzaSyTest' });
    expect(gemTarget.adapter.provider).toBe('gemini');

    const openTarget = createLlmAdapter({ apiKey: 'sk-proj-test' });
    expect(openTarget.adapter.provider).toBe('openai');
  });
});
