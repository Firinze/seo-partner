import fs from 'node:fs';
import path from 'node:path';
import type { IdeTarget, McpConfigSnippet, SupportedLanguage } from '@seo-partner/core';
import { runStdioServer } from '@seo-partner/mcp';

export interface McpCommandOptions {
  readonly projectRoot: string;
  readonly allowApply?: boolean;
  readonly lang?: SupportedLanguage;
}

export async function runMcpCommand(options: McpCommandOptions): Promise<void> {
  const projectRoot = path.resolve(options.projectRoot);
  await runStdioServer({
    projectRoot,
    allowApply: options.allowApply,
    lang: options.lang,
  });
}

export const IDE_MCP_PATHS: Record<IdeTarget, { readonly relativePath: string; readonly format: 'json' | 'toml' }> = {
  claude: { relativePath: '.mcp.json', format: 'json' },
  cursor: { relativePath: '.cursor/mcp.json', format: 'json' },
  gemini: { relativePath: '.gemini/settings.json', format: 'json' },
  agy: { relativePath: '.agents/mcp_config.json', format: 'json' },
  codex: { relativePath: '.codex/config.toml', format: 'toml' },
};

export function getMcpSnippetContent(format: 'json' | 'toml'): string {
  if (format === 'toml') {
    return [
      '[mcp_servers.seo-partner]',
      'command = "npx"',
      'args = ["-y", "seo-partner", "mcp"]',
    ].join('\n');
  }

  return JSON.stringify(
    {
      mcpServers: {
        'seo-partner': {
          command: 'npx',
          args: ['-y', 'seo-partner', 'mcp'],
        },
      },
    },
    null,
    2,
  );
}

export function buildMcpConfigSnippets(
  ideTargets: ReadonlyArray<IdeTarget>,
): ReadonlyArray<McpConfigSnippet> {
  return ideTargets.map((ide) => {
    const info = IDE_MCP_PATHS[ide];
    return {
      ide,
      relativePath: info.relativePath,
      format: info.format,
      content: getMcpSnippetContent(info.format),
      written: false,
      warning: null,
    };
  });
}

export function writeMcpConfig(
  projectRoot: string,
  snippets: ReadonlyArray<McpConfigSnippet>,
): ReadonlyArray<McpConfigSnippet> {
  return snippets.map((snippet) => {
    const fullPath = path.join(projectRoot, snippet.relativePath);
    const dir = path.dirname(fullPath);

    try {
      if (snippet.format === 'json') {
        let existingObj: Record<string, any> = {};
        if (fs.existsSync(fullPath)) {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          try {
            existingObj = JSON.parse(raw);
            if (typeof existingObj !== 'object' || existingObj === null || Array.isArray(existingObj)) {
              return {
                ...snippet,
                written: false,
                warning: `File "${snippet.relativePath}" does not contain a JSON object. Kept intact.`,
              };
            }
          } catch {
            return {
              ...snippet,
              written: false,
              warning: `File "${snippet.relativePath}" contains invalid JSON. Kept intact without overwriting.`,
            };
          }
        }

        const mcpServers =
          typeof existingObj.mcpServers === 'object' && existingObj.mcpServers !== null
            ? existingObj.mcpServers
            : {};

        mcpServers['seo-partner'] = {
          command: 'npx',
          args: ['-y', 'seo-partner', 'mcp'],
        };
        existingObj.mcpServers = mcpServers;

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, JSON.stringify(existingObj, null, 2) + '\n', 'utf-8');

        return {
          ...snippet,
          written: true,
          warning: null,
        };
      }

      // TOML format (Codex)
      if (fs.existsSync(fullPath)) {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        if (raw.includes('[mcp_servers.seo-partner]')) {
          return {
            ...snippet,
            written: true,
            warning: null,
          };
        }
        const appended = raw.endsWith('\n') ? raw + snippet.content + '\n' : raw + '\n\n' + snippet.content + '\n';
        fs.writeFileSync(fullPath, appended, 'utf-8');
        return {
          ...snippet,
          written: true,
          warning: null,
        };
      }

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, snippet.content + '\n', 'utf-8');
      return {
        ...snippet,
        written: true,
        warning: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ...snippet,
        written: false,
        warning: `Could not write MCP configuration to "${snippet.relativePath}": ${msg}`,
      };
    }
  });
}

