import crypto from 'node:crypto';
import type { WatchEntryRecord } from '@seo-partner/core';

export function computeContentHash(title: string, summary: string, pubDate: string): string {
  return crypto
    .createHash('sha256')
    .update(`${title.trim()}|${summary.trim()}|${pubDate.trim()}`)
    .digest('hex');
}

function cleanXmlText(text?: string): string {
  if (!text) return '';
  let cleaned = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  return cleaned.replace(/<[^>]+>/g, '').trim();
}

export function parseAtomFeed(
  xml: string,
  sourceId: string,
  options?: { defaultConfirmed?: boolean },
): ReadonlyArray<WatchEntryRecord> {
  const entries: WatchEntryRecord[] = [];
  const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
  const matches = xml.match(entryRegex) ?? [];

  for (const entryBlock of matches) {
    const titleMatch = entryBlock.match(/<title[\s\S]*?>([\s\S]*?)<\/title>/i);
    const title = cleanXmlText(titleMatch?.[1]) || 'Untitled';

    const linkMatch =
      entryBlock.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/>/i) ??
      entryBlock.match(/<link[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/link>/i) ??
      entryBlock.match(/<link[\s\S]*?>([^<]+)<\/link>/i);
    const officialUrl = linkMatch?.[1] ?? '';

    const summaryMatch =
      entryBlock.match(/<summary[\s\S]*?>([\s\S]*?)<\/summary>/i) ??
      entryBlock.match(/<content[\s\S]*?>([\s\S]*?)<\/content>/i);
    const summary = cleanXmlText(summaryMatch?.[1]);

    const dateMatch =
      entryBlock.match(/<published[\s\S]*?>([\s\S]*?)<\/published>/i) ??
      entryBlock.match(/<updated[\s\S]*?>([\s\S]*?)<\/updated>/i);
    const pubDate = cleanXmlText(dateMatch?.[1]) || new Date().toISOString();

    const confirmed = options?.defaultConfirmed ?? true;
    const id = `watch-${sourceId}-${computeContentHash(title, summary, pubDate).substring(0, 12)}`;

    entries.push({
      id,
      sourceId,
      title,
      summary,
      pubDate,
      officialUrl,
      confirmed,
      createdAt: new Date().toISOString(),
    });
  }

  return entries;
}

export function parseRssFeed(
  xml: string,
  sourceId: string,
  options?: { defaultConfirmed?: boolean },
): ReadonlyArray<WatchEntryRecord> {
  const entries: WatchEntryRecord[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRegex) ?? [];

  for (const itemBlock of matches) {
    const titleMatch = itemBlock.match(/<title[\s\S]*?>([\s\S]*?)<\/title>/i);
    const title = cleanXmlText(titleMatch?.[1]) || 'Untitled';

    const linkMatch = itemBlock.match(/<link[\s\S]*?>([\s\S]*?)<\/link>/i);
    const officialUrl = cleanXmlText(linkMatch?.[1]);

    const descMatch = itemBlock.match(/<description[\s\S]*?>([\s\S]*?)<\/description>/i);
    const summary = cleanXmlText(descMatch?.[1]);

    const dateMatch = itemBlock.match(/<pubDate[\s\S]*?>([\s\S]*?)<\/pubDate>/i);
    let pubDate = new Date().toISOString();
    if (dateMatch) {
      const parsedDate = new Date(cleanXmlText(dateMatch[1]));
      if (!isNaN(parsedDate.getTime())) {
        pubDate = parsedDate.toISOString();
      }
    }

    const confirmed = options?.defaultConfirmed ?? true;
    const id = `watch-${sourceId}-${computeContentHash(title, summary, pubDate).substring(0, 12)}`;

    entries.push({
      id,
      sourceId,
      title,
      summary,
      pubDate,
      officialUrl,
      confirmed,
      createdAt: new Date().toISOString(),
    });
  }

  return entries;
}
