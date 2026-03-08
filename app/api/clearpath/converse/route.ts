import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are ERoute's AI medical intake assistant for Canadian emergency rooms. You are NOT a doctor — you are conducting a quick pre-admission checklist to help route the patient to the right ER.

Your job:
1. Greet the patient warmly and ask what brought them in today.
2. Ask focused follow-up questions ONE AT A TIME to understand their situation. Ask about:
   - Main complaint / what happened
   - Pain level (1-10) and location
   - How long symptoms have been present
   - Any difficulty breathing, chest pain, dizziness, or fever
   - Any relevant medical history (allergies, medications, conditions)
   - Whether the situation is getting worse, stable, or improving
3. Do NOT assume anything. Always ask before concluding.
4. Keep responses SHORT (1-3 sentences max). Be empathetic but efficient.
5. After you have enough information (typically 4-6 exchanges), provide your assessment.

When you have enough information to make a triage decision, respond with a JSON block at the END of your message like this:
\`\`\`json
{"severity": "critical|urgent|non-urgent", "reasoning": "brief explanation", "done": true, "symptoms": {"chestPain": false, "shortnessOfBreath": false, "fever": false, "dizziness": false, "freeText": "summary of what patient described"}}
\`\`\`

Severity guide:
- critical: Life-threatening (severe chest pain, stroke symptoms, major trauma, difficulty breathing at rest, uncontrolled bleeding)
- urgent: Needs prompt care (moderate pain, high fever, worsening symptoms, possible fracture)
- non-urgent: Can wait (mild symptoms, stable condition, minor injuries, cold/flu symptoms)

IMPORTANT: Only include the JSON block when you are DONE with the conversation and have enough info. Otherwise just respond normally with your next question. Always be kind and reassuring.`;

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body as { messages: Message[] };

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });
    const modelId = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

    const fullMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    const result = await openai.chat.completions.create({
      model: modelId,
      temperature: 0.4,
      max_tokens: 300,
      messages: fullMessages,
    });

    const text = result.choices[0]?.message?.content ?? '';

    // Check if the assistant included a triage JSON block
    let triage = null;
    const jsonMatch = /```json\s*([\s\S]*?)```/.exec(text);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.done && parsed.severity && parsed.reasoning) {
          triage = {
            severity: parsed.severity,
            reasoning: parsed.reasoning,
            symptoms: parsed.symptoms || null,
          };
        }
      } catch {
        // Not valid JSON, ignore
      }
    }

    // Clean the display text (remove JSON block from what we show/speak)
    const displayText = text.replace(/```json[\s\S]*?```/g, '').trim();

    return NextResponse.json({
      reply: displayText,
      triage,
    });
  } catch (err) {
    console.error('Converse API error:', err);
    return NextResponse.json(
      { error: 'Conversation failed. Please try again.' },
      { status: 500 }
    );
  }
}
