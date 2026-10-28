import crypto from 'node:crypto';

export interface LoopGuardOptions {
  readonly maxIterations: number;
  readonly autoApply: boolean;
  readonly maxRepeatedCalls?: number; // Default 3
}

export interface GuardCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

export class LoopGuard {
  private readonly maxIterations: number;
  private readonly autoApply: boolean;
  private readonly maxRepeatedCalls: number;
  private currentIteration = 0;
  private readonly recentCalls: string[] = [];

  constructor(options: LoopGuardOptions) {
    this.maxIterations = Math.max(1, options.maxIterations);
    this.autoApply = options.autoApply;
    this.maxRepeatedCalls = options.maxRepeatedCalls ?? 3;
  }

  getIteration(): number {
    return this.currentIteration;
  }

  getMaxIterations(): number {
    return this.maxIterations;
  }

  isAutoApplyAllowed(): boolean {
    return this.autoApply;
  }

  incrementIteration(): GuardCheckResult {
    this.currentIteration += 1;
    if (this.currentIteration > this.maxIterations) {
      return {
        allowed: false,
        reason: `Iteration budget reached (${this.maxIterations} max iterations completed).`,
      };
    }
    return { allowed: true };
  }

  checkToolCall(toolName: string, args: Record<string, unknown>): GuardCheckResult {
    // 1. Budget check
    if (this.currentIteration > this.maxIterations) {
      return {
        allowed: false,
        reason: `Iteration budget exceeded: iteration ${this.currentIteration} > ${this.maxIterations}.`,
      };
    }

    // 2. Cycle detection via call hash
    const callSignature = `${toolName}:${JSON.stringify(args, Object.keys(args).sort())}`;
    const hash = crypto.createHash('sha256').update(callSignature).digest('hex').slice(0, 16);
    this.recentCalls.push(hash);

    const len = this.recentCalls.length;
    if (len >= this.maxRepeatedCalls) {
      const slice = this.recentCalls.slice(-this.maxRepeatedCalls);
      const allIdentical = slice.every((h) => h === slice[0]);
      if (allIdentical) {
        return {
          allowed: false,
          reason: `Cycle detected: tool '${toolName}' was invoked ${this.maxRepeatedCalls} times with identical arguments without state progression.`,
        };
      }
    }

    return { allowed: true };
  }

  sanitizeToolArguments(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
    if (toolName === 'propose_patch' && !this.autoApply) {
      if (args['apply'] === true) {
        return {
          ...args,
          apply: false,
        };
      }
    }
    return args;
  }
}

