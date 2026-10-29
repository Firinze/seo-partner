import { describe, it, expect, vi } from 'vitest';
import { BingWebmasterClient } from '../../src/bing/client.js';

describe('BingWebmasterClient (Unit)', () => {
  it('should resolve credentials from options or environment', () => {
    const client = new BingWebmasterClient({ apiKey: 'test-api-key' });
    expect(client.getApiKey()).toBe('test-api-key');
  });

  it('should parse GetQueryStats response correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        d: [
          {
            Query: 'seo audit tool',
            Clicks: 120,
            Impressions: 2400,
            AvgClickPosition: 3.2,
            AvgImpressionPosition: 4.1,
            Date: '/Date(1729814400000)/',
          },
          {
            Query: 'nextjs sitemap generator',
            Clicks: 85,
            Impressions: 1100,
            AvgClickPosition: 2.1,
            AvgImpressionPosition: 2.8,
            Date: '/Date(1729814400000)/',
          },
        ],
      }),
    });

    const client = new BingWebmasterClient({
      apiKey: 'test-api-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const rows = await client.getQueryStats('https://example.com');
    expect(rows.length).toBe(2);
    expect(rows[0].query).toBe('seo audit tool');
    expect(rows[0].clicks).toBe(120);
    expect(rows[0].impressions).toBe(2400);
    expect(rows[0].ctr).toBeCloseTo(0.05, 2);
    expect(rows[0].position).toBe(3.2);
  });

  it('should handle inspection of URL correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        d: {
          Url: 'https://example.com/page-1',
          IsIndexed: true,
          HttpCode: 200,
          LastCrawledDate: '/Date(1729814400000)/',
          CrawlState: 'CRAWLED_SUCCESSFULLY',
          IndexingState: 'INDEXED',
        },
      }),
    });

    const client = new BingWebmasterClient({
      apiKey: 'test-api-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const inspection = await client.inspectUrl('https://example.com/page-1');
    expect(inspection.url).toBe('https://example.com/page-1');
    expect(inspection.verdict).toBe('INDEXED');
    expect(inspection.httpCode).toBe(200);
  });
});

