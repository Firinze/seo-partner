import type {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmMessage,
  LlmProviderAdapter,
  LlmToolCall,
} from './types.js';

export interface GeminiAdapterOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetchFn?: typeof fetch;
}

export class GeminiAdapter implements LlmProviderAdapter {
  public readonly provider = 'gemini';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: GeminiAdapterOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const contents = this.formatMessages(request.messages);

    const body: Record<string, unknown> = {
      contents,
    };

    if (request.tools && request.tools.length > 0) {
      body['tools'] = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const config: Record<string, unknown> = {};
    if (typeof request.temperature === 'number') {
      config['temperature'] = request.temperature;
    }
    if (typeof request.maxTokens === 'number') {
      config['maxOutputTokens'] = request.maxTokens;
    }
    if (Object.keys(config).length > 0) {
      body['generationConfig'] = config;
    }

    const endpoint = `${this.baseUrl}/v1beta/models/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const res = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    let textContent = '';
    const toolCalls: LlmToolCall[] = [];

    for (const p of parts) {
      if (p.text) {
        textContent += p.text;
      }
      if (p.functionCall) {
        toolCalls.push({
          id: `call_${Math.random().toString(36).slice(2, 9)}`,
          name: p.functionCall.name,
          arguments: p.functionCall.args ?? {},
        });
      }
    }

    const stopReason: LlmCompletionResponse['stopReason'] =
      toolCalls.length > 0 ? 'tool_use' : 'end_turn';

    return {
      content: textContent || null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  private formatMessages(messages: ReadonlyArray<LlmMessage>): Array<Record<string, unknown>> {
    const contents: Array<Record<string, unknown>> = [];

    for (const m of messages) {
      if (m.role === 'system') {
        contents.push({
          role: 'user',
          parts: [{ text: `System instruction: ${m.content}` }],
        });
      } else if (m.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: m.toolCallId ?? 'unknown',
                response: { output: m.content },
              },
            },
          ],
        });
      } else if (m.role === 'assistant') {
        const parts: Array<Record<string, unknown>> = [];
        if (m.content) {
          parts.push({ text: m.content });
        }
        if (m.toolCalls) {
          for (const tc of m.toolCalls) {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.arguments,
              },
            });
          }
        }
        contents.push({ role: 'model', parts });
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: m.content }],
        });
      }
    }

    return contents;
  }
}

