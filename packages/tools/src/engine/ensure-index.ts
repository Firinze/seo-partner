import path from 'node:path';
import { ProjectRepository, SeoDatabase } from '@seo-partner/store';
import { runScanCommand } from './scan.js';

export interface EnsureIndexResult {
  readonly initialScanPerformed: boolean;
  readonly projectId: string;
}

export async function ensureIndex(projectRoot: string): Promise<EnsureIndexResult> {
  const resolvedRoot = path.resolve(projectRoot);

  let store = SeoDatabase.open(resolvedRoot);
  let project = new ProjectRepository(store).getLatestProject();
  store.close();

  if (project) {
    return {
      initialScanPerformed: false,
      projectId: project.id,
    };
  }

  const scanRes = await runScanCommand({ projectRoot: resolvedRoot });
  return {
    initialScanPerformed: true,
    projectId: scanRes.projectId,
  };
}

