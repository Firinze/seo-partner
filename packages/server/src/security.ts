import crypto from 'node:crypto';
import type { ApiErrorData, ApiResponseEnvelope, ProblemDetails } from '@seo-partner/core';

export const SESSION_COOKIE_NAME = 'seo_partner_session';

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function buildSessionSetCookieHeader(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/`;
}

export function parseCookies(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) {
      result[key] = val;
    }
  }
  return result;
}

export function isLoopbackHost(hostHeader: string | null | undefined, activePort: number): boolean {
  if (!hostHeader) return true;
  const normalized = hostHeader.trim().toLowerCase();
  const allowed = new Set([
    '127.0.0.1',
    'localhost',
    `127.0.0.1:${activePort}`,
    `localhost:${activePort}`,
  ]);
  return allowed.has(normalized);
}

export function isAllowedLocalOrigin(
  originHeader: string | null | undefined,
  activePort: number,
): boolean {
  if (!originHeader) return true;
  const normalized = originHeader.trim().toLowerCase();
  const allowed = new Set([
    'http://127.0.0.1',
    'http://localhost',
    `http://127.0.0.1:${activePort}`,
    `http://localhost:${activePort}`,
  ]);
  return allowed.has(normalized);
}

export function verifySessionRequest(
  headers: {
    readonly cookie?: string | null;
    readonly sessionTokenHeader?: string | null;
  },
  expectedToken: string,
): boolean {
  if (headers.sessionTokenHeader && headers.sessionTokenHeader === expectedToken) {
    return true;
  }
  const cookies = parseCookies(headers.cookie);
  return cookies[SESSION_COOKIE_NAME] === expectedToken;
}

export function buildSuccessEnvelope<T>(data: T): ApiResponseEnvelope<T> {
  return {
    success: true,
    data,
    error: null,
  };
}

export function buildErrorEnvelope(options: {
  readonly typeSlug: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
}): ApiResponseEnvelope<ApiErrorData> {
  const problem: ProblemDetails = {
    type: `https://seo-partner.local/problems/${options.typeSlug}`,
    title: options.title,
    status: options.status,
    detail: options.detail,
    instance: options.instance,
  };
  return {
    success: false,
    data: { problem },
    error: options.detail,
  };
}

export function buildCorsHeaders(
  originHeader: string | null | undefined,
  activePort: number,
): Record<string, string> {
  const resolvedOrigin =
    originHeader && isAllowedLocalOrigin(originHeader, activePort)
      ? originHeader
      : `http://127.0.0.1:${activePort}`;
  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Seo-Partner-Session',
    Vary: 'Origin',
  };
}

