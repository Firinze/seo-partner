#!/usr/bin/env node
import { executeCli } from './index.js';
import { runMcpCommand } from './commands/mcp.js';

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
