import { GoogleGenerativeAI } from '@google/generative-ai';
import { VitalsPayload, SymptomsPayload, TriageResponse } from './types';

const VALID_SEVERITIES: Array<TriageResponse['severity']> = ['critical', 'urgent', 'non-urgent'];
const MAX_REASONING_LENGTH = 200;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

const SYSTEM_PROMPT = `You are a Canadian emergency triage classifier. You are not a doctor.
Given vitals and symptoms classify urgency as one of: critical | urgent | non-urgent
Return ONLY JSON in this format: { "severity": "critical | urgent | non-urgent", "reasoning": "short explanation" }
Reasoning must be under 2 sentences.
Always end with: This is guidance only — not a medical diagnosis.`;

export class GeminiTriageError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_JSON' | 'INVALID_SCHEMA' | 'API_ERROR'
  ) {
    super(message);
    this.name = 'GeminiTriageError';
  }
}

/**
 * Strip markdown code fences and trim. Returns clean string for JSON parse.
 */
function stripMarkdownWrappers(text: string): string {
  let out = text.trim();
  const jsonBlock = /^```(?:json)?\s*([\s\S]*?)```\s*$/im.exec(out);
  if (jsonBlock) {
    out = jsonBlock[1].trim();
  }
  return out;
}

/**
 * Parse and validate Gemini JSON response. Throws GeminiTriageError if invalid.
 */
export function safeParseGeminiJSON(text: string): TriageResponse {
  const raw = stripMarkdownWrappers(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GeminiTriageError('Invalid JSON in model response', 'INVALID_JSON');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new GeminiTriageError('Response is not a JSON object', 'INVALID_SCHEMA');
  }

  const obj = parsed as Record<string, unknown>;
  const severity = obj.severity;
  const reasoning = obj.reasoning;

  if (typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity as TriageResponse['severity'])) {
    throw new GeminiTriageError(
      `Invalid severity: must be one of ${VALID_SEVERITIES.join(', ')}`,
      'INVALID_SCHEMA'
    );
  }

  if (typeof reasoning !== 'string') {
    throw new GeminiTriageError('reasoning must be a string', 'INVALID_SCHEMA');
  }

  if (reasoning.length > MAX_REASONING_LENGTH) {
    throw new GeminiTriageError(
      `reasoning must be under ${MAX_REASONING_LENGTH} characters`,
      'INVALID_SCHEMA'
    );
  }

  return {
    severity: severity as TriageResponse['severity'],
    reasoning,
  };
}

export async function classifyTriage(
  vitals: VitalsPayload,
  symptoms: SymptomsPayload
): Promise<TriageResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiTriageError('GEMINI_API_KEY is not set', 'API_ERROR');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.3,
    },
  });

  const userContent =
    `Vitals: HR=${vitals.heartRate} RR=${vitals.respiratoryRate} Stress=${vitals.stressIndex}\n` +
    `Symptoms: ${JSON.stringify(symptoms)}`;

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userContent}`;

  let lastError: GeminiTriageError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new GeminiTriageError('Empty response from model', 'INVALID_JSON');
      }

      return safeParseGeminiJSON(text);
    } catch (err) {
      if (err instanceof GeminiTriageError) {
        lastError = err;
        if (err.code === 'INVALID_JSON' && attempt === 0) {
          continue;
        }
        throw err;
      }
      throw new GeminiTriageError(
        err instanceof Error ? err.message : 'Gemini API request failed',
        'API_ERROR'
      );
    }
  }

  throw lastError ?? new GeminiTriageError('Failed to parse model response after retry', 'INVALID_JSON');
}
