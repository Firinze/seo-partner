import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { GscAuthenticator, GscClient, GscInspector } from '@seo-partner/connectors';

describe('GscConnector (Google Search Console RS256 Auth & Clients)', () => {
  // Generate a real ephemeral RSA key pair for testing
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const mockCreds = {
    client_email: 'test-sa@project.iam.gserviceaccount.com',
    private_key: privateKey,
    project_id: 'test-project',
  };

  it('generates a valid RS256 signed JWT verifiable with RSA public key', () => {
    const auth = new GscAuthenticator(mockCreds);
    const jwt = auth.createSignedJwt('https://www.googleapis.com/auth/webmasters.readonly');

    const parts = jwt.split('.');
    expect(parts.length).toBe(3);

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64!, 'base64url').toString('utf-8'));
    const payload = JSON.parse(Buffer.from(payloadB64!, 'base64url').toString('utf-8'));

    expect(header.alg).toBe('RS256');
    expect(header.typ).toBe('JWT');
    expect(payload.iss).toBe('test-sa@project.iam.gserviceaccount.com');
    expect(payload.scope).toBe('https://www.googleapis.com/auth/webmasters.readonly');

    // Cryptographic verification
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    const isValid = verifier.verify(publicKey, signatureB64!, 'base64url');
    expect(isValid).toBe(true);
  });

  it('exchanges signed JWT for OAuth2 access token with local token caching', async () => {
    let calledUrl = '';
    let calledBody = '';

    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calledUrl = String(url);
      calledBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          access_token: 'mock-oauth2-access-token-xyz',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const auth = new GscAuthenticator(mockCreds, 'https://oauth2.mock.local/token', mockFetch as typeof fetch);

    const token1 = await auth.getAccessToken();
    expect(token1).toBe('mock-oauth2-access-token-xyz');
    expect(calledUrl).toBe('https://oauth2.mock.local/token');
    expect(calledBody).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');

    // Second call should return cached token without calling mockFetch again
    calledUrl = '';
    const token2 = await auth.getAccessToken();
    expect(token2).toBe('mock-oauth2-access-token-xyz');
    expect(calledUrl).toBe('');
  });

  it('queries GSC Search Analytics and maps performance records', async () => {
    const mockAuth = {
      getAccessToken: async () => 'mock-token-abc',
    } as unknown as GscAuthenticator;

    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      expect(String(url)).toContain('/webmasters/v3/sites/https%3A%2F%2Fexample.com%2F/searchAnalytics/query');
      expect(init?.headers).toMatchObject({
        Authorization: 'Bearer mock-token-abc',
        'Content-Type': 'application/json',
      });

      return new Response(
        JSON.stringify({
          rows: [
            {
              keys: ['https://example.com/', 'agence seo'],
              clicks: 50,
              impressions: 1000,
              ctr: 0.05,
              position: 3.5,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const client = new GscClient(mockAuth, 'https://searchconsole.mock.local', mockFetch as typeof fetch);
    const records = await client.fetchPerformance({
      projectId: 'proj_123',
      siteUrl: 'https://example.com/',
      days: 28,
    });

    expect(records.length).toBe(1);
    expect(records[0]?.url).toBe('https://example.com/');
    expect(records[0]?.query).toBe('agence seo');
    expect(records[0]?.clicks).toBe(50);
    expect(records[0]?.impressions).toBe(1000);
    expect(records[0]?.ctr).toBe(0.05);
    expect(records[0]?.position).toBe(3.5);
    expect(records[0]?.id).toMatch(/^gsc_perf_/);
  });

  it('queries GSC URL Inspection and maps index status', async () => {
    const mockAuth = {
      getAccessToken: async () => 'mock-token-abc',
    } as unknown as GscAuthenticator;

    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      expect(String(url)).toContain('/v1/urlInspection/index:inspect');
      const reqBody = JSON.parse(String(init?.body));
      expect(reqBody.inspectionUrl).toBe('https://example.com/a-propos');

      return new Response(
        JSON.stringify({
          inspectionResult: {
            verdict: 'PASS',
            indexStatusResult: {
              verdict: 'PASS',
              coverageState: 'Submitted and indexed',
              robotsTxtState: 'ALLOWED',
              indexingState: 'INDEXING_ALLOWED',
              lastCrawlTime: '2026-10-25T14:32:00Z',
              pageFetchState: 'SUCCESSFUL',
              userCanonical: 'https://example.com/a-propos',
              googleCanonical: 'https://example.com/a-propos',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const inspector = new GscInspector(mockAuth, 'https://searchconsole.mock.local', mockFetch as typeof fetch);
    const record = await inspector.inspectUrl({
      projectId: 'proj_123',
      siteUrl: 'https://example.com/',
      inspectionUrl: 'https://example.com/a-propos',
    });

    expect(record.url).toBe('https://example.com/a-propos');
    expect(record.verdict).toBe('PASS');
    expect(record.coverageState).toBe('Submitted and indexed');
    expect(record.indexingState).toBe('INDEXING_ALLOWED');
    expect(record.canonicalGoogle).toBe('https://example.com/a-propos');
  });
});

