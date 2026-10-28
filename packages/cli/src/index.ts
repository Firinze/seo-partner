import { parseArgs } from 'node:util';
import type {
  CliEnvelope,
  ReportType,
  RuleCategory,
  SeverityLevel,
  SupportedLanguage,
} from '@seo-partner/core';
import { runInitCommand } from './commands/init.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runUninstallCommand } from './commands/uninstall.js';
import { runScanCommand } from './commands/scan.js';
import { runAuditCommand } from './commands/audit.js';
import { runBacklogCommand } from './commands/backlog.js';
import { runReportCommand } from './commands/report.js';
import { runMemoryAddCommand, runMemoryListCommand } from './commands/memory.js';

export * from './ide-installers/index.js';
export * from './commands/init.js';
export * from './commands/doctor.js';
export * from './commands/uninstall.js';
export * from './commands/scan.js';
export * from './commands/audit.js';
export * from './commands/backlog.js';
export * from './commands/report.js';
export * from './commands/memory.js';

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
      category: { type: 'string' },
      severity: { type: 'string' },
      'quick-wins': { type: 'boolean' },
      type: { type: 'string' },
      output: { type: 'string' },
      title: { type: 'string' },
      rationale: { type: 'string' },
      finding: { type: 'string' },
      json: { type: 'boolean' },
      offline: { type: 'boolean' },
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
        'seo-partner v0.1.0 — Deterministic Local SEO Partner',
        '',
        'Commands:',
        '  seo-partner init [--here] [--ide agy|claude|cursor|gemini|codex] [--lang en|fr] [--ignore-agent-tools] [--dry-run]',
        '  seo-partner doctor [--json]',
        '  seo-partner scan [--scope <dir>] [--rebuild] [--max-size <kb>] [--json]',
        '  seo-partner audit [--category technical|on-page|schema] [--severity critical|high|medium|low] [--json]',
        '  seo-partner backlog [--quick-wins] [--json]',
        '  seo-partner report [--type audit-complet|audit-technique|backlog] [--output <path>] [--json]',
        '  seo-partner memory list | add --title "..." --rationale "..." [--finding <id>] [--json]',
        '  seo-partner uninstall [--purge-data] [--dry-run] [--json]',
      ].join('\n');
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope({ help: helpText }), null, 2) : helpText,
        stderr: '',
      };
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
      });
      const text = `Project ready. Installed for [${res.ideTargets.join(', ')}] (lang: ${res.lang}). Files: ${res.createdFiles.length}`;
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
      const text = `Scanned ${res.filesScanned} file(s), discovered ${res.routesDiscovered} route(s) in ${res.durationMs}ms.`;
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
        outputPath:
          typeof parsed.values['output'] === 'string'
            ? parsed.values['output']
            : undefined,
        lang:
          typeof parsed.values['lang'] === 'string'
            ? (parsed.values['lang'] as SupportedLanguage)
            : undefined,
      });
      const text = `Report written to ${res.filePath} (${res.totalFindings} findings).`;
      return {
        exitCode: 0,
        stdout: jsonMode ? JSON.stringify(wrapCliEnvelope(res), null, 2) : text,
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

    throw new Error(`Unknown command: ${command}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (jsonMode) {
      return {
        exitCode: 1,
        stdout: JSON.stringify(wrapCliError(message), null, 2),
        stderr: '',
      };
    }
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Error: ${message}`,
    };
  }
}

