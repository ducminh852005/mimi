import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { getGeminiModel } from '../../_lib/gemini';
import { errorResponse, jsonResponse } from '../../_lib/response';
import type { AdaptPlanRequest, AdaptPlanResponse } from '../../../src/types/api';

export const config = { runtime: 'edge' };

// AI Prompt Pipeline §6.2 — Adaptive Planning Engine ("MIMI Adapts").
const SYSTEM_PROMPT = `You are MIMI, an empathetic AI study companion. Motto: "One step at a time, together."
Personalization Heuristics:
1. Chronotype & Time: If Chronotype == "EARLY_BIRD" and time is late (after 20:00), heavily penalize heavy tasks. If "NIGHT_OWL", allow focused drafting.
2. Course Multipliers: Multiply base task duration by the provided courseMultipliers (e.g., base 15m * 1.33 = ~20m).
3. Energy Matching: If Battery == "LOW", pick the sub-task with the lowest cognitive resistance.
4. Tone Calibration:
   - "WARM": Compassionate, soft, validating ("It's okay, let's take just one step...").
   - "DIRECT": Concise, clear, objective, under 15 words.
   - "CHEERFUL": Inspiring, enthusiastic, energetic.
5. Recommend strictly ONE actionStep. Never provide a list.`;

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    workloadSummary: {
      type: SchemaType.OBJECT,
      properties: {
        totalIdentifiedMinutes: { type: SchemaType.NUMBER },
        availableMinutes: { type: SchemaType.NUMBER },
        isOverloaded: { type: SchemaType.BOOLEAN },
      },
      required: ['totalIdentifiedMinutes', 'availableMinutes', 'isOverloaded'],
    },
    recommendation: {
      type: SchemaType.OBJECT,
      properties: {
        taskId: { type: SchemaType.STRING },
        subTaskId: { type: SchemaType.STRING },
        courseCode: { type: SchemaType.STRING },
        taskTitle: { type: SchemaType.STRING },
        actionStep: { type: SchemaType.STRING },
        allocatedMinutes: { type: SchemaType.NUMBER },
        companionMessage: { type: SchemaType.STRING },
      },
      required: [
        'taskId',
        'subTaskId',
        'courseCode',
        'taskTitle',
        'actionStep',
        'allocatedMinutes',
        'companionMessage',
      ],
    },
  },
  required: ['workloadSummary', 'recommendation'],
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use POST', 405);
  }

  let body: AdaptPlanRequest;
  try {
    body = (await request.json()) as AdaptPlanRequest;
  } catch {
    return errorResponse('INVALID_BODY', 'Expected application/json', 400);
  }

  if (!Array.isArray(body.tasks)) {
    return errorResponse('MISSING_INPUT', 'tasks[] is required', 400);
  }

  try {
    const model = getGeminiModel({ temperature: 0.35, responseSchema: RESPONSE_SCHEMA });
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: JSON.stringify(body) },
    ]);

    const parsed = JSON.parse(result.response.text()) as AdaptPlanResponse;
    return jsonResponse(parsed);
  } catch (err) {
    console.warn('[mimi-api] adapt-plan error:', (err as Error).message);
    return errorResponse('UPSTREAM_ERROR', 'Failed to compute adaptive plan', 502);
  }
}
