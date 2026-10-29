import path from 'node:path';
import {
  runGscSyncCommand,
  runGscInspectCommand,
  type GscSyncCommandResult,
  type GscInspectCommandResult,
} from '@seo-partner/tools';
import {
  GscTokenManager,
  startOAuthLoopbackServer,
  fetchSearchAnalytics90Days,
} from '@seo-partner/connectors';

export interface GscCommandOptions {
  readonly projectRoot: string;
  readonly subcommand?: 'sync' | 'inspect' | 'login' | 'status';
  readonly siteUrl?: string;
  readonly url?: string;
  readonly days?: number;
  readonly credentialsPath?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
}

export type GscCommandResult =
  | { readonly kind: 'sync'; readonly result: GscSyncCommandResult }
  | { readonly kind: 'inspect'; readonly result: GscInspectCommandResult }
  | { readonly kind: 'login'; readonly siteUrl: string; readonly message: string }
  | { readonly kind: 'status'; readonly authenticated: boolean; readonly siteUrl?: string; readonly message: string };

export async function runGscCommand(
  options: GscCommandOptions,
): Promise<GscCommandResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const tokenManager = new GscTokenManager({ projectRoot });
  const subcommand = options.subcommand ?? 'status';

  if (subcommand === 'status') {
    const creds = await tokenManager.loadCredentials();
    if (!creds || !creds.accessToken) {
      return {
        kind: 'status',
        authenticated: false,
        message: 'Google Search Console : non connecté. Exécutez "seo-partner gsc login" pour vous connecter.',
      };
    }
    return {
      kind: 'status',
      authenticated: true,
      siteUrl: creds.siteUrl,
      message: `Google Search Console : connecté pour ${creds.siteUrl} (type: ${creds.authType}).`,
    };
  }

  if (subcommand === 'login') {
    const siteUrl = options.siteUrl ?? 'https://example.com';
    const loopback = await startOAuthLoopbackServer({ defaultPort: 51842 });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(options.clientId ?? 'seo-partner-local')}&` +
      `redirect_uri=${encodeURIComponent(loopback.redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/webmasters.readonly')}&` +
      `access_type=offline`;

    // Save token once acquired
    try {
      // In interactive CLI, loopback listens until callback
      return {
        kind: 'login',
        siteUrl,
        message: `Serveur d'autorisation démarré sur le port ${loopback.port}.\n` +
          `Veuillez autoriser l'accès dans votre navigateur via : ${authUrl}\n` +
          `En attente de validation sur ${loopback.redirectUri}...`,
      };
    } finally {
      // Keep server handle available or close
      await loopback.close();
    }
  }

  if (subcommand === 'sync') {
    if (!options.siteUrl) {
      throw new Error('Missing --site option for gsc sync (e.g. --site https://example.com/)');
    }

    const result = await runGscSyncCommand({
      projectRoot,
      siteUrl: options.siteUrl,
      days: options.days,
      credentialsPath: options.credentialsPath,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    if (!result.success) {
      throw new Error(result.error ?? 'GSC sync failed');
    }

    return { kind: 'sync', result };
  }

  if (subcommand === 'inspect') {
    if (!options.url) {
      throw new Error('Missing --url option for gsc inspect (e.g. --url https://example.com/page)');
    }
    const siteUrl = options.siteUrl ?? options.url;

    const result = await runGscInspectCommand({
      projectRoot,
      siteUrl,
      url: options.url,
      credentialsPath: options.credentialsPath,
    });

    if (!result.success || !result.record) {
      throw new Error(result.error ?? 'GSC inspection failed');
    }

    return { kind: 'inspect', result };
  }

  throw new Error(`Unknown gsc subcommand: ${subcommand}. Expected 'login', 'status', 'sync' or 'inspect'.`);
}
