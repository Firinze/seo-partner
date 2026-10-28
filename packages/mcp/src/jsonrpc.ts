/**
 * JSON-RPC 2.0 Protocol Types and Helpers for MCP
 */

export const JSONRPC_VERSION = '2.0';

export const JSONRPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest<TParams = unknown> {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly method: string;
  readonly params?: TParams;
}

export interface JsonRpcNotification<TParams = unknown> {
  readonly jsonrpc: '2.0';
  readonly method: string;
  readonly params?: TParams;
}

export interface JsonRpcResponse<TResult = unknown> {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly result: TResult;
}

export interface JsonRpcErrorObject {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

export interface JsonRpcErrorResponse {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly error: JsonRpcErrorObject;
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcResponse
  | JsonRpcErrorResponse;

export function createSuccessResponse<T>(id: string | number, result: T): JsonRpcResponse<T> {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

export function createErrorResponse(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };
}

export function isJsonRpcRequest(msg: unknown): msg is JsonRpcRequest {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    m.jsonrpc === '2.0' &&
    (typeof m.id === 'string' || typeof m.id === 'number') &&
    typeof m.method === 'string'
  );
}

export function isJsonRpcNotification(msg: unknown): msg is JsonRpcNotification {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return m.jsonrpc === '2.0' && m.id === undefined && typeof m.method === 'string';
}

