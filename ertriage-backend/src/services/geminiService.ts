import { GoogleGenerativeAI } from '@google/generative-ai';
import { VitalsPayload, SymptomsPayload } from '../../../shared/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
You are a Canadian triage guidance assistant. You are NOT a doctor.
Given patient vitals and symptom answers, classify urgency into one of:
  green  = virtual care appropriate
  yellow = urgent care clinic today
  red    = ER immediately or call 911
Respond only in valid JSON:
{ "riskLevel": "green"|"yellow"|"red", "recommendation": "string", "explanation": "string" }
Explanation must be plain language, max 3 sentences.
Always include: 'This is guidance only. See a doctor for diagnosis.'
`;

function buildPrompt(vitals: VitalsPayload, symptoms: SymptomsPayload): string {
  return `
Patient Vitals:
- Heart Rate: ${vitals.heartRate} bpm
- Respiratory Rate: ${vitals.respiratoryRate} breaths/min
- Stress Index: ${vitals.stressIndex}
- Emotion State: ${vitals.emotionState}

Symptom Answers:
- Chest pain or pressure: ${symptoms.chestPain}
- Shortness of breath: ${symptoms.shortnessOfBreath}
- Fever: ${symptoms.fever}${symptoms.feverDays ? ` (${symptoms.feverDays} days)` : ''}
- Dizziness or loss of balance: ${symptoms.dizziness}
- Severe headache or confusion: ${symptoms.severeHeadache}
- Injury or bleeding: ${symptoms.injuryOrBleeding}

Classify this patient's urgency level.
`;
}

export async function classifyTriage(vitals: VitalsPayload, symptoms: SymptomsPayload) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = buildPrompt(vitals, symptoms);

  const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
  const text = result.response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Gemini response as JSON');
  }

  return JSON.parse(jsonMatch[0]) as {
    riskLevel: 'green' | 'yellow' | 'red';
    recommendation: string;
    explanation: string;
  };
}

export async function healthCheck(): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Respond with: {"status":"ok"}');
    const text = result.response.text();
    return text.includes('ok');
  } catch {
    console.warn('Gemini health check failed');
    return false;
  }
}
