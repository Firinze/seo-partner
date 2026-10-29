#!/usr/bin/env node
import { executeCli } from './index.js';
import { runMcpCommand } from './commands/mcp.js';
import { runWatchCliCommand } from './commands/watch.js';

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);

  if (rawArgs[0] === 'mcp') {
    let cwd = process.cwd();
    let allowApply = false;
    let lang = 'en';

    for (let i = 1; i < rawArgs.length; i++) {
      const arg = rawArgs[i];
      if (arg === '--cwd' && i + 1 < rawArgs.length) {
        cwd = rawArgs[++i] ?? cwd;
      } else if (arg === '--allow-apply') {
        allowApply = true;
      } else if (arg === '--lang' && i + 1 < rawArgs.length) {
        lang = rawArgs[++i] ?? lang;
      }
    }

    await runMcpCommand({
      projectRoot: cwd,
      allowApply,
      lang: lang === 'fr' ? 'fr' : 'en',
    });
    process.exitCode = 0;
  } else if (rawArgs[0] === 'watch' && !rawArgs.includes('--help') && !rawArgs.includes('-h')) {
    let cwd: string | undefined;
    let scope: string | undefined;
    let notify = false;
    let debounceMs: number | undefined;
    let json = false;
    let google = false;
    let subcommand: string | undefined;
    let offline = false;
    let force = false;

    for (let i = 1; i < rawArgs.length; i++) {
      const arg = rawArgs[i];
      if (arg === 'sync') {
        subcommand = 'sync';
      } else if (arg === '--google') {
        google = true;
      } else if (arg === '--offline') {
        offline = true;
      } else if (arg === '--force') {
        force = true;
      } else if (arg === '--cwd' && i + 1 < rawArgs.length) {
        cwd = rawArgs[++i];
      } else if (arg === '--scope' && i + 1 < rawArgs.length) {
        scope = rawArgs[++i];
      } else if (arg === '--notify') {
        notify = true;
      } else if (arg === '--debounce-ms' && i + 1 < rawArgs.length) {
        debounceMs = Number(rawArgs[++i]);
      } else if (arg === '--json') {
        json = true;
      }
    }

    await runWatchCliCommand({ cwd, scope, notify, debounceMs, json, google, subcommand, offline, force });
  } else {
    const result = await executeCli(rawArgs);
    if (result.stdout) {
      process.stdout.write(`${result.stdout}\n`);
    }
    if (result.stderr) {
      process.stderr.write(`${result.stderr}\n`);
    }
    process.exitCode = result.exitCode;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
