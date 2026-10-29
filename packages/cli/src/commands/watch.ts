import path from 'node:path';
import { WatchEngine, runWatchSync } from '@seo-partner/tools';

export interface WatchCommandCliOptions {
  cwd?: string;
  scope?: string;
  notify?: boolean;
  debounceMs?: number;
  json?: boolean;
  google?: boolean;
  subcommand?: string;
  offline?: boolean;
  force?: boolean;
}

export async function runWatchCliCommand(options: WatchCommandCliOptions): Promise<void> {
  const projectRoot = options.cwd ? path.resolve(options.cwd) : process.cwd();

  // Mode Veille Google officielle
  if (options.google || options.subcommand === 'sync') {
    const syncRes = await runWatchSync({
      projectRoot,
      offline: options.offline,
      force: options.force,
    });

    if (options.json) {
      process.stdout.write(
        JSON.stringify(
          {
            success: true,
            data: syncRes,
            error: null,
          },
          null,
          2,
        ) + '\n',
      );
    } else {
      process.stdout.write(
        `[watch] Synchronisation officielle Google terminee (${syncRes.sourcesChecked} sources controlees)\n` +
          `Date de mise a jour : ${syncRes.lastSyncTimestamp}\n` +
          `Nouvelles entrees : ${syncRes.newEntriesCount}\n` +
          `Fichier de reference actualise : skills/seo-partner/references/veille-mises-a-jour.md\n`,
      );
    }
    return;
  }

  // Mode Démon File Watcher temps réel
  const engine = new WatchEngine({
    projectRoot,
    scope: options.scope,
    debounceMs: options.debounceMs,
    notify: options.notify,
    onEvent: (event) => {
      if (!options.json) {
        process.stdout.write(`[watch] ${event.eventType.toUpperCase()} ${event.filePath}\n`);
      }
    },
    onReevaluated: (stats) => {
      if (!options.json) {
        process.stdout.write(
          `[watch] Reevaluated in ${stats.durationMs}ms — ${stats.filesScanned} files, ${stats.findingsCount} findings (${stats.blockingCount} blockers)\n`,
        );
      }
    },
    onBlockingAlert: (alert) => {
      if (!options.json) {
        process.stderr.write(`\n[ALERT] ${alert}\n\n`);
      }
    },
  });

  if (options.json) {
    process.stdout.write(
      JSON.stringify(
        {
          success: true,
          data: {
            status: 'watching',
            projectRoot,
            scope: options.scope ?? null,
            debounceMs: options.debounceMs ?? 300,
            notify: options.notify ?? false,
          },
          error: null,
        },
        null,
        2,
      ) + '\n',
    );
  } else {
    process.stdout.write(
      `seo-partner watch active on ${projectRoot} (debounce: ${options.debounceMs ?? 300}ms, notify: ${options.notify ? 'enabled' : 'disabled'})\nPress Ctrl+C to stop.\n`,
    );
  }

  await engine.start();

  const cleanup = () => {
    engine.stop();
    if (!options.json) {
      process.stdout.write('\n[watch] Daemon stopped cleanly.\n');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
