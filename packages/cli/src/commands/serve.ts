import path from 'node:path';
import {
  loadSeoConfig,
  type ServeCommandResult,
  type SupportedLanguage,
} from '@seo-partner/core';
import { ProjectRepository, SeoDatabase } from '@seo-partner/store';
import { startLocalServer, type RunningLocalServer } from '@seo-partner/server';
import { runAuditCommand } from './audit.js';

export interface ServeCommandOptions {
  readonly projectRoot: string;
  readonly port?: number;
  readonly lang?: SupportedLanguage;
  readonly noOpen?: boolean;
  readonly autoClose?: boolean;
}

export interface ServeCommandExecution {
  readonly result: ServeCommandResult;
  readonly server: RunningLocalServer;
}

export async function runServeCommand(
  options: ServeCommandOptions,
): Promise<ServeCommandExecution> {
  const projectRoot = path.resolve(options.projectRoot);
  const config = loadSeoConfig(projectRoot);
  const lang: SupportedLanguage = options.lang ?? config?.lang ?? 'fr';
  const requestedPort = options.port ?? 4321;

  // Ensure project is scanned and audited at least once if .seo/index.db has no project
  let store = SeoDatabase.open(projectRoot);
  let project = new ProjectRepository(store).getLatestProject();
  store.close();

  if (!project) {
    await runAuditCommand({ projectRoot });
    store = SeoDatabase.open(projectRoot);
    project = new ProjectRepository(store).getLatestProject();
    store.close();
  }

  const running = await startLocalServer({
    projectRoot,
    port: requestedPort,
    defaultLang: lang,
  });

  const result: ServeCommandResult = {
    host: '127.0.0.1',
    requestedPort: running.requestedPort,
    port: running.port,
    fallbackUsed: running.fallbackUsed,
    url: running.url,
    openApiUrl: `${running.url}/api/v1/openapi.json`,
    lang,
    projectId: project?.id ?? null,
  };

  if (options.autoClose) {
    await running.close();
  }

  return {
    result,
    server: running,
  };
}

