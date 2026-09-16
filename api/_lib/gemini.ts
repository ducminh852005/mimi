import { GoogleGenerativeAI, type ResponseSchema } from '@google/generative-ai';

// BFF proxy (docs/ARCHITECTURE.md §3): GEMINI_API_KEY lives only in this
// server-side module — never bundled into client code (no VITE_ prefix).
export function getGeminiModel(params: { temperature: number; responseSchema: ResponseSchema }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: params.temperature,
      responseMimeType: 'application/json',
      responseSchema: params.responseSchema,
    },
  });
}
