import type { FrameworkAdapter } from './contract.js';
import { NextJsAdapter } from './nextjs-adapter.js';
import { PhpAdapter } from './php-adapter.js';
import { StaticAdapter } from './static-adapter.js';

export const BUILTIN_ADAPTERS: ReadonlyArray<FrameworkAdapter> = [
  new NextJsAdapter(),
  new PhpAdapter(),
  new StaticAdapter(),
];

export async function detectActiveAdapters(
  projectRoot: string,
  filePaths: ReadonlyArray<string>,
  contentsByPath: ReadonlyMap<string, string>,
): Promise<ReadonlyArray<FrameworkAdapter>> {
  const active: FrameworkAdapter[] = [];
  for (const adapter of BUILTIN_ADAPTERS) {
    const matched = await adapter.detect(projectRoot, filePaths, contentsByPath);
    if (matched) {
      active.push(adapter);
    }
  }
  return active;
}
