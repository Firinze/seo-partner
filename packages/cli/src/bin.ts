#!/usr/bin/env node
import { executeCli } from './index.js';

const result = await executeCli(process.argv.slice(2));
if (result.stdout) {
  process.stdout.write(`${result.stdout}\n`);
}
if (result.stderr) {
  process.stderr.write(`${result.stderr}\n`);
}
process.exitCode = result.exitCode;

