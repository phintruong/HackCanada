import OpenAI from 'openai';
import { VitalsPayload, SymptomsPayload, TriageResponse } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a Canadian emergency triage classifier. NOT a doctor.
Given vitals and symptoms, classify urgency as one of:
  critical   = immediate ER required
  urgent     = ER today, nearest with capacity
  non-urgent = route to least congested ER
Respond ONLY in valid JSON: { "severity": "...", "reasoning": "..." }
reasoning must be plain language, max 2 sentences.
Always end with: 'This is guidance only — not a medical diagnosis.'`;

export async function classifyTriage(
  vitals: VitalsPayload,
  symptoms: SymptomsPayload
): Promise<TriageResponse> {
  const result = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Vitals: HR=${vitals.heartRate} RR=${vitals.respiratoryRate} Stress=${vitals.stressIndex}\nSymptoms: ${JSON.stringify(symptoms)}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(result.choices[0].message.content ?? '{}');
}
