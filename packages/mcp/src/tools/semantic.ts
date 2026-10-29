import fs from 'node:fs';
import path from 'node:path';
import type { ToolContext, ToolResult } from '@seo-partner/core';
import { extractPageSemantics, generateMetadataCopy } from '@seo-partner/agent';
import type { ToolDefinition, ToolValidationResult } from '@seo-partner/tools';

export interface GenerateSemanticCopyArgs {
  readonly filePath: string;
  readonly sourceCode?: string;
  readonly brandName?: string;
  readonly brandAlreadyInLayout?: boolean;
}

export const generateSemanticCopyTool: ToolDefinition<GenerateSemanticCopyArgs> = {
  name: 'generate_semantic_copy',
  title: {
    en: 'Generate Semantic Metadata (AI Copywriter)',
    fr: 'Génération Sémantique de Métadonnées (Rédacteur IA)',
  },
  description: {
    en: 'Generates high-conversion title (50-60 chars) and meta description (140-155 chars) directly for the IDE Agent without external API tokens.',
    fr: 'Génère un titre optimisé (50-60 car.) et une méta-description (140-155 car.) directement pour l\'Agent IDE sans jeton externe requis.',
  },
  inputSchema: {
    type: 'object',
    required: ['filePath'],
    additionalProperties: false,
    properties: {
      filePath: {
        type: 'string',
        description: 'Relative or absolute path to the page/route source file.',
      },
      sourceCode: {
        type: 'string',
        description: 'Optional in-memory source code. If omitted, read from disk.',
      },
      brandName: {
        type: 'string',
        description: 'Brand or application name to avoid or harmonize in title.',
      },
      brandAlreadyInLayout: {
        type: 'boolean',
        description: 'Whether the parent layout already appends the brand name.',
      },
    },
  },
  mutatesState: false,
  validateArgs: (args: unknown): ToolValidationResult<GenerateSemanticCopyArgs> => {
    if (!args || typeof args !== 'object') {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const record = args as Record<string, unknown>;
    if (typeof record['filePath'] !== 'string' || !record['filePath'].trim()) {
      return { ok: false, error: 'Missing or invalid "filePath" argument', fields: ['filePath'] };
    }
    return {
      ok: true,
      data: {
        filePath: record['filePath'],
        sourceCode: typeof record['sourceCode'] === 'string' ? record['sourceCode'] : undefined,
        brandName: typeof record['brandName'] === 'string' ? record['brandName'] : undefined,
        brandAlreadyInLayout: typeof record['brandAlreadyInLayout'] === 'boolean' ? record['brandAlreadyInLayout'] : undefined,
      },
    };
  },
  execute: async (ctx: ToolContext, args: GenerateSemanticCopyArgs): Promise<ToolResult> => {
    const fullPath = path.isAbsolute(args.filePath)
      ? args.filePath
      : path.join(ctx.projectRoot, args.filePath);

    let source = args.sourceCode;
    if (source === undefined) {
      if (!fs.existsSync(fullPath)) {
        return {
          ok: false,
          data: null,
          summary: ctx.lang === 'fr'
            ? `Fichier introuvable : ${args.filePath}`
            : `File not found: ${args.filePath}`,
          initialScanPerformed: false,
        };
      }
      source = fs.readFileSync(fullPath, 'utf-8');
    }

    const semantics = extractPageSemantics(source, path.basename(fullPath));
    const copy = generateMetadataCopy({
      semantics,
      brandName: args.brandName,
      brandAlreadyInLayout: args.brandAlreadyInLayout,
      lang: ctx.lang,
    });

    const summary = ctx.lang === 'fr'
      ? `Métadonnées générées pour ${path.basename(fullPath)} : Titre (${copy.title.length} car.), Description (${copy.description.length} car.)`
      : `Generated metadata for ${path.basename(fullPath)}: Title (${copy.title.length} chars), Description (${copy.description.length} chars)`;

    return {
      ok: true,
      data: {
        title: copy.title,
        description: copy.description,
        headingsQuality: copy.headingsQuality,
        semantics: {
          h1: semantics.h1,
          h2s: semantics.h2s,
          valueProposition: semantics.valueProposition,
        },
      },
      summary,
      initialScanPerformed: false,
    };
  },
};
