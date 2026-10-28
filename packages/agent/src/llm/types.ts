export type LlmProviderType = 'anthropic' | 'openai' | 'gemini' | 'custom';

export interface LlmToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: ReadonlyArray<string>;
  };
}

export interface LlmToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export interface LlmMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly toolCallId?: string;
  readonly toolCalls?: ReadonlyArray<LlmToolCall>;
}

export interface LlmCompletionRequest {
  readonly model: string;
  readonly messages: ReadonlyArray<LlmMessage>;
  readonly tools?: ReadonlyArray<LlmToolDefinition>;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface LlmCompletionResponse {
  readonly content: string | null;
  readonly toolCalls?: ReadonlyArray<LlmToolCall>;
  readonly stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop';
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
}

export interface LlmProviderAdapter {
  readonly provider: LlmProviderType;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}

