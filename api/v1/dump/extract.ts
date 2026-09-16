import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { getGeminiModel } from '../../_lib/gemini';
import { errorResponse, jsonResponse } from '../../_lib/response';
import type { AcademicTask } from '../../../src/types/api';

export const config = { runtime: 'edge' };

// AI Prompt Pipeline §6.1 — Extraction Engine ("Tell MIMI").
const SYSTEM_PROMPT = `You are MIMI's Academic Extraction Core.
Goal: Extract academic tasks and deadlines from unstructured multimodal input.
Requirements:
1. Deconstruct every identified task into 2-4 sequential sub-tasks (micro-steps).
2. Each micro-step MUST take between 10 and 25 minutes.
3. Classify urgency into CRITICAL, HIGH, MEDIUM, or LOW.
4. Output must strictly follow the JSON Schema. No markdown code blocks, no preamble.`;

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    tasks: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          courseCode: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          rawDeadline: { type: SchemaType.STRING },
          urgency: { type: SchemaType.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          estimatedTotalMinutes: { type: SchemaType.NUMBER },
          subTasks: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                stepIndex: { type: SchemaType.NUMBER },
                description: { type: SchemaType.STRING },
                estimatedMinutes: { type: SchemaType.NUMBER },
                isCompleted: { type: SchemaType.BOOLEAN },
              },
              required: ['id', 'stepIndex', 'description', 'estimatedMinutes', 'isCompleted'],
            },
          },
        },
        required: [
          'id',
          'courseCode',
          'title',
          'rawDeadline',
          'urgency',
          'estimatedTotalMinutes',
          'subTasks',
        ],
      },
    },
  },
  required: ['tasks'],
};

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use POST', 405);
  }

  let form: FormData;
  try {
    // Multipart/Buffer received in RAM only — never persisted to disk/S3.
    form = await request.formData();
  } catch {
    return errorResponse('INVALID_BODY', 'Expected multipart/form-data', 400);
  }

  const rawText = (form.get('rawText') as string | null) ?? '';
  const files = form.getAll('files').filter((entry): entry is File => entry instanceof File);

  if (!rawText.trim() && files.length === 0) {
    return errorResponse('MISSING_INPUT', 'Provide rawText or at least one file', 400);
  }

  try {
    const model = getGeminiModel({ temperature: 0.1, responseSchema: RESPONSE_SCHEMA });

    const fileParts = await Promise.all(
      files.map(async (file) => ({
        inlineData: {
          data: await fileToBase64(file),
          mimeType: file.type || 'application/octet-stream',
        },
      })),
    );

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: rawText || '(no raw text provided — read the attached files)' },
      ...fileParts,
    ]);

    const parsed = JSON.parse(result.response.text()) as { tasks: AcademicTask[] };
    return jsonResponse({ tasks: parsed.tasks });
  } catch (err) {
    console.warn('[mimi-api] extract error:', (err as Error).message);
    return errorResponse('UPSTREAM_ERROR', 'Failed to extract tasks', 502);
  }
}
