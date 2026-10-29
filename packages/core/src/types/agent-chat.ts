export type AgentStreamEventType =
  | 'agent:started'
  | 'agent:thought'
  | 'agent:tool_call'
  | 'agent:tool_result'
  | 'agent:patch_proposed'
  | 'agent:completed'
  | 'agent:error';

export interface AgentStreamEvent {
  readonly type: AgentStreamEventType;
  readonly sessionId: string;
  readonly timestamp: string;
  readonly payload: {
    readonly thought?: string;
    readonly toolName?: string;
    readonly toolArguments?: Record<string, unknown>;
    readonly toolResult?: Record<string, unknown>;
    readonly patchBatchId?: string;
    readonly patchUnifiedDiff?: string;
    readonly summary?: string;
    readonly costEstimateUsd?: number;
    readonly tokenCount?: { readonly prompt: number; readonly completion: number; readonly total: number };
    readonly errorMessage?: string;
  };
}

export interface AgentChatMessage {
  readonly id: string;
  readonly sessionId: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly timestamp: string;
  readonly steps?: ReadonlyArray<{
    readonly thought?: string;
    readonly toolName: string;
    readonly toolArguments: string;
    readonly toolResult: string;
  }>;
  readonly proposedPatch?: {
    readonly patchBatchId: string;
    readonly unifiedDiff: string;
    readonly applied: boolean;
  };
}

