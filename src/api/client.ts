import type {
  AcademicTask,
  AdaptPlanRequest,
  AdaptPlanResponse,
  ApiEnvelope,
  ExtractResponse,
  ReflectRequest,
  ReflectResponse,
} from '../types/api';
import { mockAdaptPlanResponse, mockReflectResponse, mockTasks } from '../utils/mockData';

// Demo Resilience Plan (docs/ARCHITECTURE.md §8): every real call gets 3500ms
// before it is abandoned; on timeout or network/HTTP error we silently swap in
// pre-warmed mock data ~300ms later instead of surfacing a spinner or an error.
const REQUEST_TIMEOUT_MS = 3500;
const MOCK_FALLBACK_DELAY_MS = 300;

const BASE_URL = '/api/v1';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withMockFallback<T>(real: () => Promise<T>, mock: T): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await real();
  } catch (err) {
    console.warn('[mimi-api] falling back to mock data:', (err as Error).message);
    await delay(MOCK_FALLBACK_DELAY_MS);
    return mock;
  } finally {
    clearTimeout(timeout);
  }
}

async function postJson<TResponse>(
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  const envelope = (await res.json()) as ApiEnvelope<TResponse>;
  if (!res.ok || !envelope.success || !envelope.data) {
    throw new Error(envelope.error?.message ?? `request to ${path} failed (${res.status})`);
  }
  return envelope.data;
}

export async function extractTasks(files: File[], rawText: string): Promise<AcademicTask[]> {
  return withMockFallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      form.append('rawText', rawText);

      const res = await fetch(`${BASE_URL}/dump/extract`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      const envelope = (await res.json()) as ApiEnvelope<ExtractResponse>;
      if (!res.ok || !envelope.success || !envelope.data) {
        throw new Error(envelope.error?.message ?? `extract failed (${res.status})`);
      }
      return envelope.data.tasks;
    } finally {
      clearTimeout(timeout);
    }
  }, mockTasks);
}

export async function adaptPlan(request: AdaptPlanRequest): Promise<AdaptPlanResponse> {
  return withMockFallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await postJson<AdaptPlanResponse>('/companion/adapt-plan', request, controller.signal);
    } finally {
      clearTimeout(timeout);
    }
  }, mockAdaptPlanResponse);
}

export async function reflect(request: ReflectRequest): Promise<ReflectResponse> {
  return withMockFallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await postJson<ReflectResponse>('/companion/reflect', request, controller.signal);
    } finally {
      clearTimeout(timeout);
    }
  }, mockReflectResponse);
}
