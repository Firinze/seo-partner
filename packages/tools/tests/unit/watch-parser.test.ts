import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseAtomFeed, parseRssFeed, computeContentHash } from '../../src/watch/feed-parser.js';

describe('Watch Feed Parser & Hasher', () => {
  it('should parse an Atom feed correctly', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      'tests/fixtures/google-feeds/search-central-atom.xml',
    );
    const xmlContent = fs.readFileSync(fixturePath, 'utf-8');

    const result = parseAtomFeed(xmlContent, 'search-central');
    expect(result.length).toBe(2);
    expect(result[0].title).toBe('Official guidance on structured data for search carousels');
    expect(result[0].officialUrl).toBe(
      'https://developers.google.com/search/blog/2026/10/carousel-structured-data',
    );
    expect(result[0].confirmed).toBe(true);
    expect(result[0].pubDate).toBe('2026-10-20T09:00:00Z');
  });

  it('should parse an RSS feed correctly', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      'tests/fixtures/google-feeds/status-rss.xml',
    );
    const xmlContent = fs.readFileSync(fixturePath, 'utf-8');

    const result = parseRssFeed(xmlContent, 'status-dashboard');
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Search Serving and Indexing Latency resolved');
    expect(result[0].officialUrl).toBe(
      'https://status.search.google.com/incidents/search-latency-2026-10',
    );
    expect(result[0].confirmed).toBe(true);
  });

  it('should compute consistent SHA-256 hashes', () => {
    const hash1 = computeContentHash('Sample Title', 'Summary text', '2026-10-20');
    const hash2 = computeContentHash('Sample Title', 'Summary text', '2026-10-20');
    const hash3 = computeContentHash('Different Title', 'Summary text', '2026-10-20');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64);
  });

  it('should mark unconfirmed algorithmic changes with confirmed: false', () => {
    const customXml = `
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Rumored update from web forum</title>
          <link href="https://example.com/unconfirmed"/>
          <summary>Unconfirmed volatility observed by third party tools</summary>
          <published>2026-10-22T00:00:00Z</published>
        </entry>
      </feed>
    `;
    const entries = parseAtomFeed(customXml, 'blog', { defaultConfirmed: false });
    expect(entries[0].confirmed).toBe(false);
  });
});

