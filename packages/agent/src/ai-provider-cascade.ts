import type { AiChannelType } from '@seo-partner/core';

export interface AiCascadeOptions {
  isMcpAvailable?: boolean;
  env?: Record<string, string | undefined>;
  localCheckFetch?: typeof fetch;
  localPort?: number;
}

export interface ActiveAiChannel {
  channel: AiChannelType;
  provider?: 'openai' | 'gemini' | 'anthropic' | 'custom';
  isAvailable: boolean;
  pedagogicMessage?: string;
}

export class AiProviderCascade {
  private isMcpAvailable: boolean;
  private env: Record<string, string | undefined>;
  private fetchFn: typeof fetch;
  private localPort: number;

  constructor(options: AiCascadeOptions = {}) {
    this.isMcpAvailable = options.isMcpAvailable ?? false;
    this.env = options.env ?? process.env;
    this.fetchFn = options.localCheckFetch ?? fetch;
    this.localPort = options.localPort ?? 11434;
  }

  public async resolveActiveChannel(): Promise<ActiveAiChannel> {
    // 1. Canal Prioritaire : Agent IDE via MCP (Zero configuration, souverain)
    if (this.isMcpAvailable) {
      return {
        channel: 'mcp_ide',
        isAvailable: true,
      };
    }

    // 2. Canal Secondaire : Clés API externes
    if (this.env['OPENAI_API_KEY']) {
      return {
        channel: 'external_api',
        provider: 'openai',
        isAvailable: true,
      };
    }
    if (this.env['GEMINI_API_KEY']) {
      return {
        channel: 'external_api',
        provider: 'gemini',
        isAvailable: true,
      };
    }
    if (this.env['ANTHROPIC_API_KEY']) {
      return {
        channel: 'external_api',
        provider: 'anthropic',
        isAvailable: true,
      };
    }

    // 3. Canal Tertiaire : Modèle local OpenCode / Ollama
    try {
      const res = await this.fetchFn(`http://localhost:${this.localPort}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000),
      });
      if (res && res.ok) {
        return {
          channel: 'opencode_local',
          isAvailable: true,
        };
      }
    } catch {
      // Local endpoint offline or unreachable
    }

    // 4. Refus Pédagogique Propre (Aucun marqueur TODO-SEO)
    const pedagogicMessage = [
      'Aucun moteur d\'intelligence artificielle disponible pour la rédaction sémantique.',
      '',
      'Pour activer la rédaction automatique de vos métadonnées :',
      '1. Activez le serveur MCP de votre IDE (Gemini / Claude / Cursor) via le fichier .mcp.json généré par seo-partner.',
      '2. Ou exportez une clé d\'API : OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY.',
      '3. Ou démarrez un serveur d\'inférence local compatible (Ollama sur le port 11434).',
      '',
      'Conformément aux principes de souveraineté et d\'excellence, aucun marqueur de remplacement temporaire n\'a été inséré.',
    ].join('\n');

    return {
      channel: 'none',
      isAvailable: false,
      pedagogicMessage,
    };
  }
}
