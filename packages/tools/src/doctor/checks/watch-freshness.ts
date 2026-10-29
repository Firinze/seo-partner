import path from 'node:path';
import fs from 'node:fs';
import { SeoDatabase, WatchRepository } from '@seo-partner/store';

export interface WatchFreshnessCheckResult {
  readonly id: 'watch-freshness';
  readonly status: 'ok' | 'warn' | 'error';
  readonly message: string;
  readonly lastSyncDate: string | null;
  readonly diffDays: number | null;
}

export function checkWatchFreshness(projectRoot: string, maxAgeDays = 90): WatchFreshnessCheckResult {
  const resolvedRoot = path.resolve(projectRoot);

  // 1. Check SQLite watch_source if database exists
  let latestSyncDate: string | null = null;
  try {
    const store = SeoDatabase.open(resolvedRoot);
    const watchRepo = new WatchRepository(store);
    latestSyncDate = watchRepo.getLatestSyncDate();
    store.close();
  } catch {
    // Best effort: fallback to file inspection
  }

  // 2. Fallback to skills reference file if SQLite empty
  if (!latestSyncDate) {
    const candidateFiles = [
      path.join(resolvedRoot, 'skills', 'seo-partner', 'references', 'veille-mises-a-jour.md'),
      path.join(resolvedRoot, '.agents', 'skills', 'seo-partner', 'references', 'veille-mises-a-jour.md'),
      path.join(resolvedRoot, '.claude', 'skills', 'seo-partner', 'references', 'veille-mises-a-jour.md'),
      path.join(resolvedRoot, '.cursor', 'skills', 'seo-partner', 'references', 'veille-mises-a-jour.md'),
      path.join(resolvedRoot, '.gemini', 'skills', 'seo-partner', 'references', 'veille-mises-a-jour.md'),
      path.join(resolvedRoot, '.codex', 'skills', 'seo-partner', 'references', 'veille-mises-a-jour.md'),
      path.join(resolvedRoot, '.windsurf', 'skills', 'seo-partner', 'references', 'veille-mises-a-jour.md'),
      path.join(resolvedRoot, '.cline', 'skills', 'seo-partner', 'references', 'veille-mises-a-jour.md'),
    ];

    for (const filePath of candidateFiles) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const match = /(?:Last Verified|Dernière vérification|Dernière synchronisation officielle)\s*:\s*(\d{4}-\d{2}-\d{2})/i.exec(content);
        if (match?.[1]) {
          latestSyncDate = match[1];
          break;
        }
      }
    }
  }

  if (!latestSyncDate) {
    return {
      id: 'watch-freshness',
      status: 'warn',
      message: "Aucune synchronisation de veille officielle trouvée. Exécutez 'seo-partner watch --google' pour actualiser.",
      lastSyncDate: null,
      diffDays: null,
    };
  }

  const diffMs = Date.now() - new Date(latestSyncDate).getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 3600 * 24)));
  const fresh = diffDays <= maxAgeDays;

  return {
    id: 'watch-freshness',
    status: fresh ? 'ok' : 'warn',
    message: fresh
      ? `Veille officielle Google à jour (${latestSyncDate}, il y a ${diffDays} j, seuil <= ${maxAgeDays} j)`
      : `Dernière veille Google datant de plus de 90 jours (${diffDays} j). Exécutez 'seo-partner watch --google' pour actualiser.`,
    lastSyncDate: latestSyncDate,
    diffDays,
  };
}
