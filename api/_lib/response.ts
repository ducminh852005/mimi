import type { ApiEnvelope } from '../../src/types/api';

export function jsonResponse<T>(data: T, status = 200): Response {
  const body: ApiEnvelope<T> = { success: true, data, error: null };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function errorResponse(code: string, message: string, status = 400): Response {
  const body: ApiEnvelope<null> = { success: false, data: null, error: { code, message } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
