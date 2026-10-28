import type {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmMessage,
  LlmProviderAdapter,
  LlmToolCall,
} from './types.js';

export interface AnthropicAdapterOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetchFn?: typeof fetch;
}

export class AnthropicAdapter implements LlmProviderAdapter {
  public readonly provider = 'anthropic';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: AnthropicAdapterOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.anthropic.com').replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const system = systemMessage?.content;

    const messages = this.formatMessages(request.messages.filter((m) => m.role !== 'system'));

    const tools = request.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      messages,
    };

    if (system) {
      body['system'] = system;
    }
    if (typeof request.temperature === 'number') {
      body['temperature'] = request.temperature;
    }
    if (tools && tools.length > 0) {
      body['tools'] = tools;
    }

    const res = await this.fetchFn(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;

    let textContent = '';
    const toolCalls: LlmToolCall[] = [];

    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: (block.input as Record<string, unknown>) ?? {},
          });
        }
      }
    }

    const stopReason: LlmCompletionResponse['stopReason'] =
      data.stop_reason === 'tool_use'
        ? 'tool_use'
        : data.stop_reason === 'max_tokens'
          ? 'max_tokens'
          : 'end_turn';

    return {
      content: textContent || null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens ?? 0,
            completionTokens: data.usage.output_tokens ?? 0,
            totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
          }
        : undefined,
    };
  }

  private formatMessages(messages: ReadonlyArray<LlmMessage>): Array<Record<string, unknown>> {
    const formatted: Array<Record<string, unknown>> = [];

    for (const m of messages) {
      if (m.role === 'tool') {
        formatted.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: m.toolCallId,
              content: m.content,
            },
          ],
        });
      } else if (m.role === 'assistant') {
        const content: Array<Record<string, unknown>> = [];
        if (m.content) {
          content.push({ type: 'text', text: m.content });
        }
        if (m.toolCalls) {
          for (const tc of m.toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            });
          }
        }
        formatted.push({ role: 'assistant', content });
      } else {
        formatted.push({ role: 'user', content: m.content });
      }
    }

    return formatted;
  }
}

