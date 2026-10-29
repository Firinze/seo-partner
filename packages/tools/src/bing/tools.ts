import type {
  ToolContext,
  ToolResult,
} from '@seo-partner/core';
import type { ToolDefinition, ToolValidationResult } from '../registry.js';
import {
  runBingSyncCommand,
  runBingInspectCommand,
  getBingPerformanceSummary,
} from './orchestrator.js';

export interface GetBingPerformanceArgs {
  readonly siteUrl: string;
  readonly limit?: number;
}

export interface InspectBingUrlArgs {
  readonly url: string;
  readonly siteUrl?: string;
}

export const getBingPerformanceTool: ToolDefinition<GetBingPerformanceArgs> = {
  name: 'get_bing_performance',
  title: {
    en: 'Get Bing Performance Data',
    fr: 'Obtenir les données de performance Bing',
  },
  description: {
    en: 'Fetch or retrieve cached Bing Webmaster performance stats (clicks, impressions, CTR, position) with 7-day TTL.',
    fr: 'Récupérer ou lire en cache les statistiques de performance Bing Webmaster (clics, impressions, CTR, position) avec un TTL de 7 jours.',
  },
  inputSchema: {
    type: 'object',
    properties: {
      siteUrl: {
        type: 'string',
        description: 'The site URL registered in Bing Webmaster Tools (e.g. https://example.com)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of query rows to return (default: 100)',
      },
    },
    required: ['siteUrl'],
    additionalProperties: false,
  },
  mutatesState: false,
  validateArgs(args: unknown): ToolValidationResult<GetBingPerformanceArgs> {
    if (!args || typeof args !== 'object') {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const a = args as Record<string, unknown>;
    if (typeof a['siteUrl'] !== 'string' || !a['siteUrl'].trim()) {
      return { ok: false, error: 'siteUrl must be a non-empty string' };
    }
    const limit = typeof a['limit'] === 'number' && a['limit'] > 0 ? a['limit'] : undefined;
    return {
      ok: true,
      data: {
        siteUrl: String(a['siteUrl']).trim(),
        limit,
      },
    };
  },
  async execute(ctx: ToolContext, args: GetBingPerformanceArgs): Promise<ToolResult> {
    try {
      let summary = await getBingPerformanceSummary({
        projectRoot: ctx.projectRoot,
        siteUrl: args.siteUrl,
        limit: args.limit,
      });

      if (!summary.fromCache && summary.rows.length === 0) {
        try {
          await runBingSyncCommand({
            projectRoot: ctx.projectRoot,
            siteUrl: args.siteUrl,
          });
          summary = await getBingPerformanceSummary({
            projectRoot: ctx.projectRoot,
            siteUrl: args.siteUrl,
            limit: args.limit,
          });
        } catch {
          // Si la synchronisation échoue (ex: pas de clé), on renvoie le résumé vide
        }
      }

      const textSummary =
        ctx.lang === 'fr'
          ? `Performance Bing pour ${args.siteUrl} : ${summary.totalClicks} clics, ${summary.totalImpressions} impressions, position moy. ${summary.averagePosition.toFixed(1)} (${summary.rows.length} requêtes, cache: ${summary.fromCache}).`
          : `Bing performance for ${args.siteUrl}: ${summary.totalClicks} clicks, ${summary.totalImpressions} impressions, avg position ${summary.averagePosition.toFixed(1)} (${summary.rows.length} queries, cached: ${summary.fromCache}).`;

      return {
        ok: true,
        data: summary,
        summary: textSummary,
        initialScanPerformed: false,
      };
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        data: { error: err },
        summary: ctx.lang === 'fr' ? `Échec récupération Bing : ${err}` : `Bing fetch failed: ${err}`,
        initialScanPerformed: false,
      };
    }
  },
};

export const inspectBingUrlTool: ToolDefinition<InspectBingUrlArgs> = {
  name: 'inspect_bing_url',
  title: {
    en: 'Inspect Bing URL',
    fr: 'Inspecter une URL sur Bing',
  },
  description: {
    en: 'Inspect indexation status, crawl state, and HTTP code of a URL on Bing Webmaster Tools with 7-day TTL.',
    fr: "Inspecter le statut d'indexation, l'état d'exploration et le code HTTP d'une URL sur Bing Webmaster Tools avec TTL 7 jours.",
  },
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The absolute URL to inspect',
      },
      siteUrl: {
        type: 'string',
        description: 'Optional site URL registered in Bing',
      },
    },
    required: ['url'],
    additionalProperties: false,
  },
  mutatesState: false,
  validateArgs(args: unknown): ToolValidationResult<InspectBingUrlArgs> {
    if (!args || typeof args !== 'object') {
      return { ok: false, error: 'Arguments must be an object' };
    }
    const a = args as Record<string, unknown>;
    if (typeof a['url'] !== 'string' || !a['url'].trim()) {
      return { ok: false, error: 'url must be a non-empty string' };
    }
    const siteUrl = typeof a['siteUrl'] === 'string' && a['siteUrl'].trim() ? a['siteUrl'].trim() : undefined;
    return {
      ok: true,
      data: {
        url: String(a['url']).trim(),
        siteUrl,
      },
    };
  },
  async execute(ctx: ToolContext, args: InspectBingUrlArgs): Promise<ToolResult> {
    try {
      const record = await runBingInspectCommand({
        projectRoot: ctx.projectRoot,
        url: args.url,
        siteUrl: args.siteUrl,
      });

      const textSummary =
        ctx.lang === 'fr'
          ? `Inspection Bing ${args.url} : verdict ${record.verdict}, état indexation : ${record.indexingState}, code HTTP : ${record.httpCode}.`
          : `Bing inspection for ${args.url}: verdict ${record.verdict}, indexing state: ${record.indexingState}, HTTP code: ${record.httpCode}.`;

      return {
        ok: true,
        data: record,
        summary: textSummary,
        initialScanPerformed: false,
      };
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        data: { error: err },
        summary: ctx.lang === 'fr' ? `Échec inspection Bing : ${err}` : `Bing inspection failed: ${err}`,
        initialScanPerformed: false,
      };
    }
  },
};
