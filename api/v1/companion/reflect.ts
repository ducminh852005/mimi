import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { getGeminiModel } from '../../_lib/gemini';
import { errorResponse, jsonResponse } from '../../_lib/response';
import type { ReflectRequest, ReflectResponse } from '../../../src/types/api';

export const config = { runtime: 'edge' };

// AI Prompt Pipeline §6.3 — Behavioral Learning Engine ("MIMI Learns").
const SYSTEM_PROMPT = `You are MIMI's Study Mirror Core.
Analyze the student's reflection (planned vs actual time, feedback, obstacle).
Generate:
1. learnedPattern: A supportive, hyper-personalized insight under 20 words referencing their course or study pattern.
2. varianceRatio: Multiplier to adjust future time estimates (Actual / Planned).`;

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    learnedPattern: { type: SchemaType.STRING },
    varianceRatio: { type: SchemaType.NUMBER },
  },
  required: ['learnedPattern', 'varianceRatio'],
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use POST', 405);
  }

  let body: ReflectRequest;
  try {
    body = (await request.json()) as ReflectRequest;
  } catch {
    return errorResponse('INVALID_BODY', 'Expected application/json', 400);
  }

  if (!body.taskId || !body.courseCode) {
    return errorResponse('MISSING_INPUT', 'taskId and courseCode are required', 400);
  }

  try {
    const model = getGeminiModel({ temperature: 0.2, responseSchema: RESPONSE_SCHEMA });
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: JSON.stringify(body) },
    ]);

    const parsed = JSON.parse(result.response.text()) as {
      learnedPattern: string;
      varianceRatio: number;
    };

    const response: ReflectResponse = {
      sessionId: `ses_${crypto.randomUUID()}`,
      studyMirror: {
        learnedPattern: parsed.learnedPattern,
        behaviorMetric: {
          courseCode: body.courseCode,
          varianceRatio: parsed.varianceRatio,
        },
      },
    };
    return jsonResponse(response);
  } catch (err) {
    console.warn('[mimi-api] reflect error:', (err as Error).message);
    return errorResponse('UPSTREAM_ERROR', 'Failed to generate study mirror insight', 502);
  }
}
