import fs from 'node:fs';
import path from 'node:path';
import { getSeoDirPath } from './config.js';

export interface OutboundLogEntry {
  readonly timestamp: string;
  readonly targetUrl: string;
  readonly method: string;
  readonly payloadBytes: number;
  readonly blockedByOfflineMode: boolean;
  readonly purpose: string;
}

export function getOutboundLogPath(projectRoot: string): string {
  return path.join(getSeoDirPath(projectRoot), 'logs', 'outbound.jsonl');
}

export function recordOutboundRequest(
  projectRoot: string,
  entry: Omit<OutboundLogEntry, 'timestamp'>,
): OutboundLogEntry {
  const fullEntry: OutboundLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  const logPath = getOutboundLogPath(projectRoot);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(fullEntry)}\n`, 'utf-8');
  return fullEntry;
}

export function assertNetworkAllowed(
  projectRoot: string,
  offlineMode: boolean,
  targetUrl: string,
  purpose: string,
): void {
  if (offlineMode) {
    recordOutboundRequest(projectRoot, {
      targetUrl,
      method: 'BLOCKED',
      payloadBytes: 0,
      blockedByOfflineMode: true,
      purpose,
    });
    throw new Error(
      `Network request blocked because --offline mode is active (target: ${targetUrl})`,
    );
  }
}

export function readOutboundLog(projectRoot: string): ReadonlyArray<OutboundLogEntry> {
  const logPath = getOutboundLogPath(projectRoot);
  if (!fs.existsSync(logPath)) {
    return [];
  }
  const lines = fs
    .readFileSync(logPath, 'utf-8')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  return lines.map((line) => JSON.parse(line) as OutboundLogEntry);
}

