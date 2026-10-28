import { parseArgs } from 'node:util';
import type {
  CliEnvelope,
  ReportFormat,
  ReportType,
  RuleCategory,
  SeverityLevel,
  SupportedLanguage,
} from '@seo-partner/core';
import { SsrfBlockedError } from '@seo-partner/crawler';
import { runInitCommand } from './commands/init.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runUninstallCommand } from './commands/uninstall.js';
import { runScanCommand } from './commands/scan.js';
import { runCrawlCommand } from './commands/crawl.js';
import { runAuditCommand } from './commands/audit.js';
import { runBacklogCommand } from './commands/backlog.js';
import { runReportCommand } from './commands/report.js';
import { runMemoryAddCommand, runMemoryListCommand } from './commands/memory.js';
import { runServeCommand } from './commands/serve.js';
import { runMcpCommand } from './commands/mcp.js';
import { runPatchCommand } from './commands/patch.js';
import { runGscCommand } from './commands/gsc.js';
import { runCwvCommand } from './commands/cwv.js';
import { runAgentCommand } from './commands/agent.js';

export * from './ide-installers/index.js';
export * from './commands/init.js';
export * from './commands/doctor.js';
export * from './commands/uninstall.js';
export * from './commands/scan.js';
export * from './commands/crawl.js';
export * from './commands/audit.js';
export * from './commands/backlog.js';
export * from './commands/report.js';
export * from './commands/memory.js';
export * from './commands/serve.js';
export * from './commands/mcp.js';
export * from './commands/patch.js';
export * from './commands/gsc.js';
export * from './commands/cwv.js';
export * from './commands/agent.js';

export function wrapCliEnvelope<T>(data: T): CliEnvelope<T> {
  return {
    success: true,
    data,
    error: null,
  };
}

export function wrapCliError(errorMessage: string): CliEnvelope<null> {
  return {
    success: false,
    data: null,
    error: errorMessage,
  };
}

export async function executeCli(
  argv: ReadonlyArray<string>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const parsed = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: false,
    options: {
      cwd: { type: 'string' },
      here: { type: 'boolean' },
      ide: { type: 'string' },
      integration: { type: 'string' },
      lang: { type: 'string' },
      'ignore-agent-tools': { type: 'boolean' },
      'terminal-only': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      'purge-data': { type: 'boolean' },
      scope: { type: 'string' },
      rebuild: { type: 'boolean' },
      'max-size': { type: 'string' },
      'max-pages': { type: 'string' },
      'max-depth': { type: 'string' },
      concurrency: { type: 'string' },
      'rate-limit-ms': { type: 'string' },
      'max-redirects': { type: 'string' },
      'allow-local': { type: 'boolean' },
      js: { type: 'boolean' },
      resume: { type: 'string' },
      'crawl-run': { type: 'string' },
      category: { type: 'string' },
      severity: { type: 'string' },
      'quick-wins': { type: 'boolean' },
      type: { type: 'string' },
      format: { type: 'string' },
      output: { type: 'string' },
      title: { type: 'string' },
      rationale: { type: 'string' },
      finding: { type: 'string' },
      rule: { type: 'string' },
      apply: { type: 'boolean' },
      force: { type: 'boolean' },
      'with-mcp': { type: 'boolean' },
      'allow-apply': { type: 'boolean' },
      port: { type: 'string' },
      'no-open': { type: 'boolean' },
      json: { type: 'boolean' },
      offline: { type: 'boolean' },
      site: { type: 'string' },
      url: { type: 'string' },
      days: { type: 'string' },
      credentials: { type: 'string' },
      'start-date': { type: 'string' },
      'end-date': { type: 'string' },
      'with-cwv': { type: 'boolean' },
      refresh: { type: 'boolean' },
      'form-factor': { type: 'string' },
      'api-key': { type: 'string' },
      goal: { type: 'string' },
      provider: { type: 'string' },
      model: { type: 'string' },
      'base-url': { type: 'string' },
      'max-iterations': { type: 'string' },
      'auto-apply': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  const command = parsed.positionals[0] ?? 'help';
  const subcommand = parsed.positionals[1];
  const jsonMode = Boolean(parsed.values['json']);
  const projectRoot =
    typeof parsed.values['cwd'] === 'string'
      ? parsed.values['cwd']
      : process.cwd();

  try {
    if (command === 'help' || parsed.values['help']) {
      const helpText = [
        'seo-partner v0.6.0 — Deterministic Local SEO Partner',
        '',
        'Commands:',
        '  seo-partner init [--here] [--ide agy|claude|cursor|gemini|codex] [--with-mcp] [--lang en|fr] [--ignore-agent-tools] [--dry-run]',
        '  seo-partner doctor [--json]',
        '  seo-partner scan [--scope <dir>] [--rebuild] [--max-size <kb>] [--json]',
        '  seo-partner crawl <url> [--allow-local] [--max-pages <n>] [--max-depth <n>] [--concurrency <n>] [--rate-limit-ms <ms>] [--js] [--resume <runId>] [--offline] [--json]',
        '  seo-partner audit [--category technical|on-page|schema|local|geo|performance] [--severity critical|high|medium|low] [--crawl-run <id>] [--with-cwv] [--json]',
        '  seo-partner backlog [--quick-wins] [--json]',
        '  seo-partner patch [--finding <id>] [--rule <ruleId>] [--apply] [--force] [--lang fr|en] [--json]',
        '  seo-partner gsc sync --site <url> [--days <n>] [--credentials <path>] [--json]',
        '  seo-partner gsc inspect --url <url> [--site <url>] [--credentials <path>] [--json]',
        '  seo-partner cwv fetch --url <url> [--form-factor PHONE|DESKTOP|ALL] [--refresh] [--offline] [--json]',
        '  seo-partner agent run --goal "..." [--provider anthropic|openai|gemini|custom] [--model <name>] [--base-url <url>] [--max-iterations <n>] [--auto-apply] [--json]',
        '  seo-partner report [--type audit-complet|audit-technique|backlog] [--format md|html|json] [--output <path>] [--json]',
        '  seo-partner serve [--port <number>] [--lang fr|en] [--no-open] [--json]',
        '  seo-partner memory list | add --title "..." --rationale "..." [--finding <id>] [--json]',
        '  seo-partner mcp [--allow-apply] [--cwd <dir>]',
        '  seo-partner uninstall [--purge-data] [--dry-run] [--json]',
      ].join('\n');
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope({ help: helpText }), null, 2) : helpText,
        stderr: '',
      };
    }

    if (command === 'mcp') {
      throw new Error(
        "The 'mcp' command runs a persistent JSON-RPC stdio server and cannot be invoked via executeCli(). Run 'seo-partner mcp' directly as a subprocess.",
      );
    }

    if (command === 'init') {
      const ideArg =
        typeof parsed.values['ide'] === 'string'
          ? parsed.values['ide']
          : typeof parsed.values['integration'] === 'string'
            ? parsed.values['integration']
            : undefined;
      const res = runInitCommand({
        projectRoot,
        ide: ideArg,
        lang: typeof parsed.values['lang'] === 'string' ? parsed.values['lang'] : undefined,
        terminalOnly: Boolean(parsed.values['terminal-only']),
        dryRun: Boolean(parsed.values['dry-run']),
        ignoreAgentTools: Boolean(parsed.values['ignore-agent-tools'] ?? true),
        withMcp: Boolean(parsed.values['with-mcp']),
      });
      let text = `Project ready. Installed for [${res.ideTargets.join(', ')}] (lang: ${res.lang}). Files: ${res.createdFiles.length}`;
      if (res.mcpSnippets && res.mcpSnippets.length > 0) {
        if (parsed.values['with-mcp']) {
          const writtenList = res.mcpSnippets.filter((s) => s.written).map((s) => s.relativePath);
          text += `\nMCP configurations written to: ${writtenList.join(', ')}`;
        } else {
          text += `\nTip: run with --with-mcp to auto-configure MCP servers, or copy snippets for [${res.mcpSnippets.map((s) => s.ide).join(', ')}].`;
        }
      }
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'doctor') {
      const res = runDoctorCommand({ projectRoot });
      const text = res.checks
        .map((c) => `[${c.status.toUpperCase()}] ${c.id}: ${c.message}`)
        .join('\n');
      return {
        exitCode: res.healthy ? 0 : 1,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'uninstall') {
      const res = runUninstallCommand({
        projectRoot,
        purgeData: Boolean(parsed.values['purge-data']),
        dryRun: Boolean(parsed.values['dry-run']),
      });
      const text = `Uninstalled ${res.removedPaths.length} item(s).`;
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'scan') {
      const maxSizeVal =
        typeof parsed.values['max-size'] === 'string'
          ? Number(parsed.values['max-size'])
          : undefined;
      const res = await runScanCommand({
        projectRoot,
        scopeDir: typeof parsed.values['scope'] === 'string' ? parsed.values['scope'] : undefined,
        rebuild: Boolean(parsed.values['rebuild']),
        maxFileSizeKb: maxSizeVal,
      });
      const text = `Scanned ${res.filesScanned} file(s) (parsed: ${res.filesParsed}, reused: ${res.filesReused}, purged: ${res.filesPurged}), discovered ${res.routesDiscovered} route(s) in ${res.durationMs}ms.`;
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'crawl') {
      if (!subcommand) {
        throw new Error('Missing target URL for crawl command (usage: seo-partner crawl <url>)');
      }
      const res = await runCrawlCommand({
        projectRoot,
        startUrl: subcommand,
        resumeRunId:
          typeof parsed.values['resume'] === 'string' ? parsed.values['resume'] : undefined,
        offline: Boolean(parsed.values['offline']),
        maxPages:
          typeof parsed.values['max-pages'] === 'string'
            ? Number(parsed.values['max-pages'])
            : undefined,
        maxDepth:
          typeof parsed.values['max-depth'] === 'string'
            ? Number(parsed.values['max-depth'])
            : undefined,
        concurrency:
          typeof parsed.values['concurrency'] === 'string'
            ? Number(parsed.values['concurrency'])
            : undefined,
        rateLimitMs:
          typeof parsed.values['rate-limit-ms'] === 'string'
            ? Number(parsed.values['rate-limit-ms'])
            : undefined,
        maxRedirects:
          typeof parsed.values['max-redirects'] === 'string'
            ? Number(parsed.values['max-redirects'])
            : undefined,
        allowLocal: Boolean(parsed.values['allow-local']),
        js: Boolean(parsed.values['js']),
      });
      const text = `Crawl ${res.crawlRunId} completed: ${res.pagesCrawled} page(s) crawled, ${res.errorsCount} error(s) in ${res.durationMs}ms.`;
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'audit') {
      const res = await runAuditCommand({
        projectRoot,
        category:
          typeof parsed.values['category'] === 'string'
            ? (parsed.values['category'] as RuleCategory)
            : undefined,
        severity:
          typeof parsed.values['severity'] === 'string'
            ? (parsed.values['severity'] as SeverityLevel)
            : undefined,
        crawlRunId:
          typeof parsed.values['crawl-run'] === 'string'
            ? parsed.values['crawl-run']
            : undefined,
        withCwv: Boolean(parsed.values['with-cwv']),
      });
      const text = `Audit complete: ${res.totalFindings} finding(s) (${res.blockingIndexingCount} blocking indexing).`;
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'backlog') {
      const res = await runBacklogCommand({
        projectRoot,
        quickWinsOnly: Boolean(parsed.values['quick-wins']),
      });
      const text = res.actions
        .map(
          (a, i) =>
            `${i + 1}. [${a.ruleId}] ${a.subjectRef} — ICE: ${a.ice.score.toFixed(2)}${a.blocksIndexing ? ' (BLOCKS INDEXING)' : ''}`,
        )
        .join('\n');
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text || 'No backlog actions.',
        stderr: '',
      };
    }

    if (command === 'report') {
      const res = await runReportCommand({
        projectRoot,
        reportType:
          typeof parsed.values['type'] === 'string'
            ? (parsed.values['type'] as ReportType)
            : undefined,
        format:
          typeof parsed.values['format'] === 'string'
            ? (parsed.values['format'] as ReportFormat)
            : undefined,
        outputPath:
          typeof parsed.values['output'] === 'string'
            ? parsed.values['output']
            : undefined,
        lang:
          typeof parsed.values['lang'] === 'string'
            ? (parsed.values['lang'] as SupportedLanguage)
            : undefined,
        crawlRunId:
          typeof parsed.values['crawl-run'] === 'string'
            ? parsed.values['crawl-run']
            : undefined,
      });
      const text = `Report written to ${res.filePath} (${res.totalFindings} findings).`;
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'patch') {
      const langArg =
        parsed.values['lang'] === 'fr' || parsed.values['lang'] === 'en'
          ? (parsed.values['lang'] as SupportedLanguage)
          : undefined;
      const res = await runPatchCommand({
        projectRoot,
        findingId:
          typeof parsed.values['finding'] === 'string'
            ? parsed.values['finding']
            : undefined,
        ruleId:
          typeof parsed.values['rule'] === 'string'
            ? parsed.values['rule']
            : undefined,
        apply: Boolean(parsed.values['apply']),
        force: Boolean(parsed.values['force']),
        lang: langArg,
      });

      return {
        exitCode: 0,
        stdout: jsonMode
          ? JSON.stringify(wrapCliEnvelope(res.batch), null, 2)
          : res.outputText,
        stderr: '',
      };
    }

    if (command === 'serve') {
      const portArg =
        typeof parsed.values['port'] === 'string'
          ? Number(parsed.values['port'])
          : 4321;
      const langArg =
        parsed.values['lang'] === 'en' || parsed.values['lang'] === 'fr'
          ? parsed.values['lang']
          : undefined;
      const autoClose = Boolean(parsed.values['dry-run']);
      const { result } = await runServeCommand({
        projectRoot,
        port: Number.isFinite(portArg) ? portArg : 4321,
        lang: langArg,
        noOpen: Boolean(parsed.values['no-open']),
        autoClose,
      });
      const fallbackNotice = result.fallbackUsed
        ? ` (port ${result.requestedPort} busy -> auto-fallback to ${result.port})`
        : '';
      const text = `Local Dashboard & API listening on ${result.url}${fallbackNotice} — OpenAPI: ${result.openApiUrl}`;
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(result), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'memory') {
      if (subcommand === 'add') {
        const res = runMemoryAddCommand({
          projectRoot,
          title: typeof parsed.values['title'] === 'string' ? parsed.values['title'] : '',
          rationale:
            typeof parsed.values['rationale'] === 'string'
              ? parsed.values['rationale']
              : '',
          findingId:
            typeof parsed.values['finding'] === 'string'
              ? parsed.values['finding']
              : undefined,
        });
        return {
          exitCode: 0,
          stdout: jsonMode
            ? JSON.stringify(wrapCliEnvelope(res), null, 2)
            : `Decision recorded: ${res.decisions[0]?.title ?? ''}`,
          stderr: '',
        };
      }
      const res = runMemoryListCommand({ projectRoot });
      return {
        exitCode: 0,
        stdout: jsonMode
          ? JSON.stringify(wrapCliEnvelope(res), null, 2)
          : res.decisions.map((d) => `[${d.date}] ${d.title}: ${d.rationale}`).join('\n') ||
            'No decisions recorded.',
        stderr: '',
      };
    }

    if (command === 'gsc') {
      if (subcommand !== 'sync' && subcommand !== 'inspect') {
        throw new Error("Missing or invalid subcommand for 'gsc'. Usage: seo-partner gsc <sync|inspect> [options]");
      }

      const daysVal =
        typeof parsed.values['days'] === 'string'
          ? Number(parsed.values['days'])
          : undefined;

      const res = await runGscCommand({
        projectRoot,
        subcommand,
        siteUrl: typeof parsed.values['site'] === 'string' ? parsed.values['site'] : undefined,
        url: typeof parsed.values['url'] === 'string' ? parsed.values['url'] : undefined,
        days: daysVal,
        credentialsPath:
          typeof parsed.values['credentials'] === 'string'
            ? parsed.values['credentials']
            : undefined,
        startDate:
          typeof parsed.values['start-date'] === 'string'
            ? parsed.values['start-date']
            : undefined,
        endDate:
          typeof parsed.values['end-date'] === 'string'
            ? parsed.values['end-date']
            : undefined,
      });

      let text = '';
      if (res.kind === 'sync') {
        text = `GSC sync completed: ${res.result.recordsCount} record(s) synced for ${res.result.siteUrl}.`;
      } else {
        const r = res.result.record;
        text = `GSC inspection completed for ${r?.url}: verdict=${r?.verdict}, coverage=${r?.coverageState}.`;
      }

      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res.kind === 'sync' ? res.result : res.result.record), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'cwv') {
      if (subcommand !== 'fetch') {
        throw new Error("Missing or invalid subcommand for 'cwv'. Usage: seo-partner cwv fetch --url <url> [options]");
      }

      const formFactorArg =
        parsed.values['form-factor'] === 'PHONE' ||
        parsed.values['form-factor'] === 'DESKTOP' ||
        parsed.values['form-factor'] === 'ALL'
          ? (parsed.values['form-factor'] as 'PHONE' | 'DESKTOP' | 'ALL')
          : undefined;

      const res = await runCwvCommand({
        projectRoot,
        url: typeof parsed.values['url'] === 'string' ? parsed.values['url'] : undefined,
        formFactor: formFactorArg,
        refresh: Boolean(parsed.values['refresh']),
        offline: Boolean(parsed.values['offline']),
        apiKey: typeof parsed.values['api-key'] === 'string' ? parsed.values['api-key'] : undefined,
      });

      const text = `CWV fetch completed: ${res.records.length} metric record(s) for ${res.url} (cached: ${res.cached}).`;

      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
        stderr: '',
      };
    }

    if (command === 'agent') {
      const maxIterVal =
        typeof parsed.values['max-iterations'] === 'string'
          ? Number(parsed.values['max-iterations'])
          : undefined;

      const langArg =
        parsed.values['lang'] === 'en' || parsed.values['lang'] === 'fr'
          ? parsed.values['lang']
          : undefined;

      const providerArg =
        parsed.values['provider'] === 'anthropic' ||
        parsed.values['provider'] === 'openai' ||
        parsed.values['provider'] === 'gemini' ||
        parsed.values['provider'] === 'custom'
          ? parsed.values['provider']
          : undefined;

      const res = await runAgentCommand({
        projectRoot,
        subcommand: subcommand ?? 'run',
        goal: typeof parsed.values['goal'] === 'string' ? parsed.values['goal'] : undefined,
        provider: providerArg,
        model: typeof parsed.values['model'] === 'string' ? parsed.values['model'] : undefined,
        apiKey: typeof parsed.values['api-key'] === 'string' ? parsed.values['api-key'] : undefined,
        baseUrl: typeof parsed.values['base-url'] === 'string' ? parsed.values['base-url'] : undefined,
        maxIterations: maxIterVal,
        autoApply: Boolean(parsed.values['auto-apply']),
        lang: langArg,
      });

      const text = [
        `Agent session ${res.session.id} (${res.session.status}): ${res.session.iterationsCompleted}/${res.session.maxIterations} iterations completed.`,
        `Patches generated: ${res.session.patchesGenerated}, applied: ${res.session.patchesApplied}.`,
        `Summary: ${res.summary}`,
      ].join('\n');

      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
        stderr: '',
      };
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isSecurityOrOfflineBlock =
      err instanceof SsrfBlockedError ||
      message.includes('--offline') ||
      (err && typeof err === 'object' && 'refusal' in err && (err as any).refusal?.code === 'unsafe-path');
    const exitCode = isSecurityOrOfflineBlock ? 3 : 1;

    if (jsonMode) {
      return {
        exitCode,
        stdout: JSON.stringify(wrapCliError(message), null, 2),
        stderr: '',
      };
    }
    return {
      exitCode,
      stdout: '',
      stderr: `Error: ${message}`,
    };
  }
}
