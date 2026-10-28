import path from 'node:path';
import {
  AutonomousAgent,
  type AgentRunResult,
  type LlmProviderType,
} from '@seo-partner/agent';

export interface AgentCommandOptions {
  readonly projectRoot: string;
  readonly subcommand: string;
  readonly goal?: string;
  readonly provider?: LlmProviderType;
  readonly model?: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly maxIterations?: number;
  readonly autoApply?: boolean;
  readonly lang?: 'fr' | 'en';
}

export async function runAgentCommand(
  options: AgentCommandOptions,
): Promise<AgentRunResult> {
  const projectRoot = path.resolve(options.projectRoot);

  if (options.subcommand !== 'run') {
    throw new Error(`Unknown agent subcommand: ${options.subcommand}. Expected 'run' (usage: seo-partner agent run --goal "...")`);
  }

  if (!options.goal || !options.goal.trim()) {
    throw new Error('Missing --goal parameter for agent run (usage: seo-partner agent run --goal "Audit and fix SEO issues")');
  }

  const agent = new AutonomousAgent();
  return await agent.run({
    projectRoot,
    goal: options.goal.trim(),
    provider: options.provider,
    model: options.model,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    maxIterations: options.maxIterations,
    autoApply: options.autoApply,
    lang: options.lang,
  });
}

