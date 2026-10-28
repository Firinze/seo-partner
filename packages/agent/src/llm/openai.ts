import type {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmMessage,
  LlmProviderAdapter,
  LlmProviderType,
  LlmToolCall,
} from './types.js';

export interface OpenAiAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly provider?: 'openai' | 'custom';
  readonly fetchFn?: typeof fetch;
}

export class OpenAiAdapter implements LlmProviderAdapter {
  public readonly provider: LlmProviderType;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: OpenAiAdapterOptions) {
    this.provider = options?.provider ?? 'openai';
    this.apiKey = options?.apiKey;
    this.baseUrl = (options?.baseUrl ?? 'https://api.openai.com').replace(/\/+$/, '');
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const messages = this.formatMessages(request.messages);

    const tools = request.tools?.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
    };

    if (typeof request.temperature === 'number') {
      body['temperature'] = request.temperature;
    }
    if (typeof request.maxTokens === 'number') {
      body['max_tokens'] = request.maxTokens;
    }
    if (tools && tools.length > 0) {
      body['tools'] = tools;
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (this.apiKey) {
      headers['authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await this.fetchFn(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI-compatible API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const choice = data.choices?.[0];
    const msg = choice?.message;

    let toolCalls: LlmToolCall[] | undefined;
    if (Array.isArray(msg?.tool_calls)) {
      toolCalls = msg.tool_calls.map((tc: any) => {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = typeof tc.function?.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function?.arguments ?? {};
        } catch {
          parsedArgs = {};
        }
        return {
          id: tc.id ?? `call_${Math.random().toString(36).slice(2, 9)}`,
          name: tc.function?.name ?? '',
          arguments: parsedArgs,
        };
      });
    }

    const stopReason: LlmCompletionResponse['stopReason'] =
      choice?.finish_reason === 'tool_calls'
        ? 'tool_use'
        : choice?.finish_reason === 'length'
          ? 'max_tokens'
          : 'end_turn';

    return {
      content: msg?.content ?? null,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      stopReason,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
    };
  }

  private formatMessages(messages: ReadonlyArray<LlmMessage>): Array<Record<string, unknown>> {
    const formatted: Array<Record<string, unknown>> = [];

    for (const m of messages) {
      if (m.role === 'tool') {
        formatted.push({
          role: 'tool',
          tool_call_id: m.toolCallId,
          content: m.content,
        });
      } else if (m.role === 'assistant') {
        const item: Record<string, unknown> = {
          role: 'assistant',
          content: m.content || null,
        };
        if (m.toolCalls && m.toolCalls.length > 0) {
          item['tool_calls'] = m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          }));
        }
        formatted.push(item);
      } else {
        formatted.push({
          role: m.role,
          content: m.content,
        });
      }
    }

    return formatted;
  }
}

