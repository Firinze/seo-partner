import fs from 'node:fs';
import path from 'node:path';
import type { ConnectorCredential } from '@seo-partner/core';

export interface GscTokenManagerOptions {
  projectRoot: string;
  fetchFn?: typeof fetch;
  tokenEndpoint?: string;
}

export class GscTokenManager {
  private projectRoot: string;
  private credsDir: string;
  private credsFile: string;
  private fetchFn: typeof fetch;
  private tokenEndpoint: string;

  constructor(options: GscTokenManagerOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.credsDir = path.join(this.projectRoot, '.seo', 'credentials');
    this.credsFile = path.join(this.credsDir, 'gsc.json');
    this.fetchFn = options.fetchFn ?? fetch;
    this.tokenEndpoint = options.tokenEndpoint ?? 'https://oauth2.googleapis.com/token';
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.credsDir)) {
      fs.mkdirSync(this.credsDir, { recursive: true });
    }
  }

  public async saveCredentials(credential: ConnectorCredential): Promise<void> {
    this.ensureDir();
    fs.writeFileSync(this.credsFile, JSON.stringify(credential, null, 2), 'utf-8');
  }

  public async loadCredentials(): Promise<ConnectorCredential | null> {
    if (!fs.existsSync(this.credsFile)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(this.credsFile, 'utf-8');
      return JSON.parse(raw) as ConnectorCredential;
    } catch {
      return null;
    }
  }

  public async getValidAccessToken(oauthConfig?: {
    clientId: string;
    clientSecret: string;
  }): Promise<string | null> {
    const creds = await this.loadCredentials();
    if (!creds || !creds.accessToken) {
      return null;
    }

    const now = Date.now();
    // Valid if expiry is at least 60 seconds in future
    if (creds.expiresAt && creds.expiresAt > now + 60000) {
      return creds.accessToken;
    }

    // Attempt refresh if refresh_token and oauthConfig provided
    if (creds.refreshToken && oauthConfig?.clientId && oauthConfig?.clientSecret) {
      const params = new URLSearchParams({
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await this.fetchFn(this.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (response.ok) {
        const data = (await response.json()) as { access_token: string; expires_in: number };
        creds.accessToken = data.access_token;
        creds.expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
        await this.saveCredentials(creds);
        return creds.accessToken;
      }
    }

    return null;
  }
}

