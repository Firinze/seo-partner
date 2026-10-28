import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface ServiceAccountCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  token_uri?: string;
}

export interface GscTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class GscAuthenticator {
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  public constructor(
    private readonly credentials: ServiceAccountCredentials,
    private readonly tokenEndpoint: string = 'https://oauth2.googleapis.com/token',
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  public static fromFile(
    filePath: string,
    tokenEndpoint?: string,
    fetchFn?: typeof fetch,
  ): GscAuthenticator {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const creds = JSON.parse(raw) as ServiceAccountCredentials;
    return new GscAuthenticator(creds, tokenEndpoint, fetchFn);
  }

  public static resolveFromProject(
    projectRoot: string,
    tokenEndpoint?: string,
    fetchFn?: typeof fetch,
  ): GscAuthenticator | null {
    const envCreds = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
    if (envCreds && fs.existsSync(envCreds)) {
      return GscAuthenticator.fromFile(envCreds, tokenEndpoint, fetchFn);
    }

    const defaultPath = path.join(projectRoot, '.seo', 'credentials.json');
    if (fs.existsSync(defaultPath)) {
      try {
        const raw = fs.readFileSync(defaultPath, 'utf-8');
        const parsed = JSON.parse(raw) as { gsc?: ServiceAccountCredentials } | ServiceAccountCredentials;
        if ('private_key' in parsed && 'client_email' in parsed) {
          return new GscAuthenticator(parsed, tokenEndpoint, fetchFn);
        }
        if ('gsc' in parsed && parsed.gsc?.private_key && parsed.gsc?.client_email) {
          return new GscAuthenticator(parsed.gsc, tokenEndpoint, fetchFn);
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  public createSignedJwt(scope = 'https://www.googleapis.com/auth/webmasters.readonly'): string {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.credentials.client_email,
      scope,
      aud: this.tokenEndpoint,
      exp: now + 3600,
      iat: now,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const content = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(content);
    const signature = signer.sign(this.credentials.private_key, 'base64url');

    return `${content}.${signature}`;
  }

  public async getAccessToken(scope = 'https://www.googleapis.com/auth/webmasters.readonly'): Promise<string> {
    const nowMs = Date.now();
    // Re-use token if valid for at least 5 more minutes
    if (this.cachedToken && this.tokenExpiresAt > nowMs + 300_000) {
      return this.cachedToken;
    }

    const jwt = this.createSignedJwt(scope);
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    });

    const res = await this.fetchFn(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google OAuth2 Token Error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as GscTokenResponse;
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
    return this.cachedToken;
  }
}

