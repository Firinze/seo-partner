export type WatchSourceKind = 'search-central' | 'status-dashboard' | 'blog';

export interface WatchSourceRecord {
  readonly id: string;
  readonly url: string;
  readonly kind: WatchSourceKind;
  readonly lastCheckedAt: string | null;
  readonly contentHash: string | null;
}

export interface WatchEntryRecord {
  readonly id: string;
  readonly sourceId: string;
  readonly title: string;
  readonly summary: string;
  readonly pubDate: string;
  readonly officialUrl: string;
  readonly confirmed: boolean; // false = « Rapporté, à vérifier »
  readonly createdAt: string;
}

export interface WatchSyncResult {
  readonly sourcesChecked: number;
  readonly newEntriesCount: number;
  readonly updatedEntriesCount: number;
  readonly lastSyncTimestamp: string;
  readonly entries: ReadonlyArray<WatchEntryRecord>;
}

