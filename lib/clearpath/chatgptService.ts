import OpenAI from 'openai';
import { VitalsPayload, SymptomsPayload, TriageResponse } from './types';

const VALID_SEVERITIES: Array<TriageResponse['severity']> = ['critical', 'urgent', 'non-urgent'];
const MAX_REASONING_LENGTH = 200;

const SYSTEM_PROMPT = `You are a Canadian emergency triage classifier. You are not a doctor.
Given vitals and symptoms classify urgency as one of: critical | urgent | non-urgent
Return ONLY JSON in this format: { "severity": "critical | urgent | non-urgent", "reasoning": "short explanation" }
Reasoning must be under 2 sentences.
Always end with: This is guidance only — not a medical diagnosis.`;

export class ChatGPTTriageError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_JSON' | 'INVALID_SCHEMA' | 'API_ERROR'
  ) {
    super(message);
    this.name = 'ChatGPTTriageError';
  }
}

/**
 * Strip markdown and extract JSON from model response (handles extra text before/after).
 */
function extractJSONString(text: string): string {
  let out = text.trim();

  // 1) Markdown code block: ```json ... ``` or ``` ... ```
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(out);
  if (codeBlock) {
    return codeBlock[1].trim();
  }

  // 2) Find first { and matching } to extract a single JSON object
  const firstBrace = out.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = firstBrace; i < out.length; i++) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) {
      return out.slice(firstBrace, end + 1);
    }
  }

  return out;
}

/**
 * Parse and validate model JSON response. Throws ChatGPTTriageError if invalid.
 */
export function safeParseTriageJSON(text: string): TriageResponse {
  const raw = extractJSONString(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ChatGPTTriageError('Invalid JSON in model response', 'INVALID_JSON');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ChatGPTTriageError('Response is not a JSON object', 'INVALID_SCHEMA');
  }

  const obj = parsed as Record<string, unknown>;
  const severity = obj.severity;
  const reasoning = obj.reasoning;

  if (typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity as TriageResponse['severity'])) {
    throw new ChatGPTTriageError(
      `Invalid severity: must be one of ${VALID_SEVERITIES.join(', ')}`,
      'INVALID_SCHEMA'
    );
  }

  if (typeof reasoning !== 'string') {
    throw new ChatGPTTriageError('reasoning must be a string', 'INVALID_SCHEMA');
  }

  const trimmedReasoning = reasoning.length > MAX_REASONING_LENGTH
    ? reasoning.slice(0, MAX_REASONING_LENGTH).trim()
    : reasoning;

  return {
    severity: severity as TriageResponse['severity'],
    reasoning: trimmedReasoning,
  };
}

export async function classifyTriage(
  vitals: VitalsPayload,
  symptoms: SymptomsPayload
): Promise<TriageResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ChatGPTTriageError('OPENAI_API_KEY is not set', 'API_ERROR');
  }

  const openai = new OpenAI({ apiKey });
  const modelId = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const userContent =
    `Vitals: HR=${vitals.heartRate} RR=${vitals.respiratoryRate} Stress=${vitals.stressIndex}\n` +
    `Symptoms: ${JSON.stringify(symptoms)}`;

  let lastError: ChatGPTTriageError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await openai.chat.completions.create({
        model: modelId,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      });

      const text = result.choices[0]?.message?.content;

      if (!text) {
        throw new ChatGPTTriageError('Empty response from model', 'INVALID_JSON');
      }

      return safeParseTriageJSON(text);
    } catch (err) {
      if (err instanceof ChatGPTTriageError) {
        lastError = err;
        if (err.code === 'INVALID_JSON' && attempt === 0) {
          continue;
        }
        throw err;
      }
      throw new ChatGPTTriageError(
        err instanceof Error ? err.message : 'OpenAI API request failed',
        'API_ERROR'
      );
    }
  }

  throw lastError ?? new ChatGPTTriageError('Failed to parse model response after retry', 'INVALID_JSON');
}
