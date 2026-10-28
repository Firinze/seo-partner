import { AnthropicAdapter } from './anthropic.js';
import { OpenAiAdapter } from './openai.js';
import { GeminiAdapter } from './gemini.js';
import type { LlmProviderAdapter, LlmProviderType } from './types.js';

export interface CreateLlmAdapterOptions {
  readonly provider?: LlmProviderType;
  readonly model?: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly fetchFn?: typeof fetch;
}

export interface ResolvedLlmTarget {
  readonly adapter: LlmProviderAdapter;
  readonly defaultModel: string;
}

export function createLlmAdapter(options: CreateLlmAdapterOptions = {}): ResolvedLlmTarget {
  const envAnthropic = process.env['ANTHROPIC_API_KEY'];
  const envOpenAi = process.env['OPENAI_API_KEY'];
  const envGemini = process.env['GEMINI_API_KEY'];

  // 1. Explicit baseUrl or custom provider
  if (options.baseUrl || options.provider === 'custom') {
    const adapter = new OpenAiAdapter({
      provider: 'custom',
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? 'http://localhost:11434/v1',
      fetchFn: options.fetchFn,
    });
    return {
      adapter,
      defaultModel: options.model ?? 'llama3',
    };
  }

  // 2. Explicit provider
  if (options.provider === 'anthropic') {
    const key = options.apiKey ?? envAnthropic;
    if (!key) {
      throw new Error('Anthropic provider requested but no API key provided (set ANTHROPIC_API_KEY or use --api-key).');
    }
    return {
      adapter: new AnthropicAdapter({ apiKey: key, baseUrl: options.baseUrl, fetchFn: options.fetchFn }),
      defaultModel: options.model ?? 'claude-3-5-sonnet-20241022',
    };
  }

  if (options.provider === 'gemini') {
    const key = options.apiKey ?? envGemini;
    if (!key) {
      throw new Error('Gemini provider requested but no API key provided (set GEMINI_API_KEY or use --api-key).');
    }
    return {
      adapter: new GeminiAdapter({ apiKey: key, baseUrl: options.baseUrl, fetchFn: options.fetchFn }),
      defaultModel: options.model ?? 'gemini-2.0-flash',
    };
  }

  if (options.provider === 'openai') {
    const key = options.apiKey ?? envOpenAi;
    if (!key) {
      throw new Error('OpenAI provider requested but no API key provided (set OPENAI_API_KEY or use --api-key).');
    }
    return {
      adapter: new OpenAiAdapter({ provider: 'openai', apiKey: key, baseUrl: options.baseUrl, fetchFn: options.fetchFn }),
      defaultModel: options.model ?? 'gpt-4o-mini',
    };
  }

  // 3. Auto-detect from environment
  if (options.apiKey) {
    // If apiKey starts with sk-ant, use anthropic; if AIza, use gemini; otherwise openai
    if (options.apiKey.startsWith('sk-ant-')) {
      return {
        adapter: new AnthropicAdapter({ apiKey: options.apiKey, baseUrl: options.baseUrl, fetchFn: options.fetchFn }),
        defaultModel: options.model ?? 'claude-3-5-sonnet-20241022',
      };
    }
    if (options.apiKey.startsWith('AIza')) {
      return {
        adapter: new GeminiAdapter({ apiKey: options.apiKey, baseUrl: options.baseUrl, fetchFn: options.fetchFn }),
        defaultModel: options.model ?? 'gemini-2.0-flash',
      };
    }
    return {
      adapter: new OpenAiAdapter({ provider: 'openai', apiKey: options.apiKey, baseUrl: options.baseUrl, fetchFn: options.fetchFn }),
      defaultModel: options.model ?? 'gpt-4o-mini',
    };
  }

  if (envAnthropic) {
    return {
      adapter: new AnthropicAdapter({ apiKey: envAnthropic, baseUrl: options.baseUrl, fetchFn: options.fetchFn }),
      defaultModel: options.model ?? 'claude-3-5-sonnet-20241022',
    };
  }

  if (envGemini) {
    return {
      adapter: new GeminiAdapter({ apiKey: envGemini, baseUrl: options.baseUrl, fetchFn: options.fetchFn }),
      defaultModel: options.model ?? 'gemini-2.0-flash',
    };
  }

  if (envOpenAi) {
    return {
      adapter: new OpenAiAdapter({ provider: 'openai', apiKey: envOpenAi, baseUrl: options.baseUrl, fetchFn: options.fetchFn }),
      defaultModel: options.model ?? 'gpt-4o-mini',
    };
  }

  // Fallback to local custom inference server (Ollama compatible)
  return {
    adapter: new OpenAiAdapter({
      provider: 'custom',
      baseUrl: 'http://localhost:11434/v1',
      fetchFn: options.fetchFn,
    }),
    defaultModel: options.model ?? 'llama3',
  };
}

