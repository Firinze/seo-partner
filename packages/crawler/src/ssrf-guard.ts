import dns from 'node:dns/promises';
import net from 'node:net';

export class SsrfBlockedError extends Error {
  public readonly code = 'SSRF_BLOCKED';
  public readonly targetUrl: string;
  public readonly reason: string;

  public constructor(targetUrl: string, reason: string) {
    super(`SSRF protection blocked URL "${targetUrl}": ${reason}`);
    this.name = 'SsrfBlockedError';
    this.targetUrl = targetUrl;
    this.reason = reason;
  }
}

export function isCloudMetadataIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  if (normalized === '169.254.169.254' || normalized === '::ffff:169.254.169.254') {
    return true;
  }
  return false;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();

  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.slice('::ffff:'.length);
    if (net.isIPv4(v4Part)) {
      return isPrivateOrReservedIp(v4Part);
    }
  }

  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map((p) => Number(p));
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;

    // 0.0.0.0/8 (current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (private)
    if (a === 10) return true;
    // 100.64.0.0/10 (shared address space)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (link-local / cloud metadata)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (private)
    if (a === 192 && b === 168) return true;

    return false;
  }

  if (net.isIPv6(normalized)) {
    if (normalized === '::1' || normalized === '::' || normalized === '0:0:0:0:0:0:0:1') {
      return true;
    }
    // Unique local addresses fc00::/7 (fc00..fdff)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    // Link-local fe80::/10
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export function isLocalHostname(hostname: string): boolean {
  const lower = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.test') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  return false;
}

export interface ValidateCrawlUrlOptions {
  readonly allowLocal?: boolean;
  readonly dnsLookup?: (hostname: string) => Promise<ReadonlyArray<string>>;
}

export async function validateCrawlUrlAndResolveIp(
  rawUrl: string,
  options?: ValidateCrawlUrlOptions,
): Promise<{ parsedUrl: URL; resolvedIps: ReadonlyArray<string> }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError(rawUrl, 'Invalid URL syntax');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new SsrfBlockedError(
      rawUrl,
      `Unsupported protocol "${parsedUrl.protocol}" (only http: and https: are allowed)`,
    );
  }

  const allowLocal = Boolean(options?.allowLocal);
  const rawHost = parsedUrl.hostname.replace(/^\[|\]$/g, '');

  // Always block cloud metadata IP 169.254.169.254 even if --allow-local is enabled
  if (isCloudMetadataIp(rawHost)) {
    throw new SsrfBlockedError(
      rawUrl,
      'Cloud metadata address 169.254.169.254 is strictly forbidden',
    );
  }

  const ipVersion = net.isIP(rawHost);
  if (ipVersion !== 0) {
    if (!allowLocal && isPrivateOrReservedIp(rawHost)) {
      throw new SsrfBlockedError(
        rawUrl,
        `Private or loopback IP "${rawHost}" requires explicit --allow-local flag`,
      );
    }
    return { parsedUrl, resolvedIps: [rawHost] };
  }

  if (!allowLocal && isLocalHostname(rawHost)) {
    throw new SsrfBlockedError(
      rawUrl,
      `Local hostname "${rawHost}" requires explicit --allow-local flag`,
    );
  }

  let resolvedIps: ReadonlyArray<string>;
  try {
    if (options?.dnsLookup) {
      resolvedIps = await options.dnsLookup(rawHost);
    } else {
      const records = await dns.lookup(rawHost, { all: true });
      resolvedIps = records.map((r) => r.address);
    }
  } catch {
    if (allowLocal && isLocalHostname(rawHost)) {
      resolvedIps = ['127.0.0.1'];
    } else {
      throw new SsrfBlockedError(rawUrl, `Unable to resolve hostname "${rawHost}"`);
    }
  }

  if (resolvedIps.length === 0) {
    throw new SsrfBlockedError(rawUrl, `No IP addresses resolved for "${rawHost}"`);
  }

  for (const ip of resolvedIps) {
    if (isCloudMetadataIp(ip)) {
      throw new SsrfBlockedError(
        rawUrl,
        `Hostname "${rawHost}" resolved to forbidden cloud metadata IP ${ip}`,
      );
    }
    if (!allowLocal && isPrivateOrReservedIp(ip)) {
      throw new SsrfBlockedError(
        rawUrl,
        `Hostname "${rawHost}" resolved to private/local IP "${ip}" (use --allow-local for local development servers such as Laragon)`,
      );
    }
  }

  return { parsedUrl, resolvedIps };
}

