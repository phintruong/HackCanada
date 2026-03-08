import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { BuildingConfig } from '@/lib/buildingConfig';
import { defaultBuildingConfig } from '@/lib/buildingConfig';

const SYSTEM_PROMPT = `You are a building design assistant. Given a user's natural-language description, produce a JSON building configuration.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "config": { ... BuildingConfig fields ... },
  "confirmation": "short sentence confirming what you designed"
}

BuildingConfig fields and allowed values:
- floors: integer 1-200 (number of floors)
- width: number 5-500 (meters)
- length: number 5-500 (meters)
- heightPerFloor: number 2.5-6 (meters per floor)
- wallColor: color name (e.g. "white", "gray", "red", "blue", "beige", "brown") or hex like "#cc3333"
- windowStyle: "none" | "basic" | "glass" | "arched" | "circular" | "triangular"
- texture: "smooth" | "concrete" | "brick" | "wood" | "glass"
- roofStyle: "flat" | "gable" | "hip"
- style: "modern" | "classic" | "industrial"
- notes: optional string with extra notes

Hospital parameters (include ONLY if the user mentions a hospital, clinic, or medical facility):
- hospitalBeds: integer (total patient beds, e.g. 50-500)
- hospitalDoctors: integer (number of doctors)
- hospitalNurses: integer (number of nurses)
- hospitalRooms: integer (total rooms)
- hospitalOperatingRooms: integer (surgical operating rooms)
- hospitalEmergencyBays: integer (emergency department bays)
- hospitalAmbulances: integer (ambulance count)
- hospitalTraumaRooms: integer (dedicated trauma rooms)
- hospitalFloors: integer (floors dedicated to hospital use)

Guidelines:
- If the user mentions a hospital/clinic, set reasonable hospital parameters based on the size.
- Small clinic: ~20-50 beds, 5-10 doctors, 15-30 nurses, 1-2 ORs, 4-6 ER bays
- Medium hospital: ~100-200 beds, 20-40 doctors, 60-120 nurses, 4-8 ORs, 10-20 ER bays
- Large hospital: ~300-500 beds, 50-100 doctors, 150-300 nurses, 8-15 ORs, 20-40 ER bays
- Always include ALL non-hospital fields (floors, width, length, etc.) in every response.
- For hospital buildings, default to flat roof, modern style, glass/concrete texture unless specified.
- The confirmation should be a brief, friendly sentence (under 40 words).
- For hospitals/clinics, mention key stats in the confirmation (e.g. beds, doctors, floors) so the user hears them back.`;

function extractJSON(text: string): string {
  let out = text.trim();
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(out);
  if (codeBlock) out = codeBlock[1].trim();
  const braceMatch = out.match(/\{[\s\S]*\}/);
  if (braceMatch) out = braceMatch[0];
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, previousConfig } = body as {
      text: string;
      previousConfig?: Partial<BuildingConfig>;
    };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text input is required.' },
        { status: 400 }
      );
    }

    const mergedPrevious = { ...defaultBuildingConfig, ...previousConfig };

    const userMessage = previousConfig
      ? `Current building configuration:\n${JSON.stringify(mergedPrevious, null, 2)}\n\nUser request: "${text.trim()}"\n\nUpdate ONLY the fields the user mentioned. Keep all other fields at their current values.`
      : `User request: "${text.trim()}"\n\nCreate a new building configuration based on this description. Use sensible defaults for any unspecified fields.`;

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: 'No response from AI model.' },
        { status: 500 }
      );
    }

    const jsonStr = extractJSON(raw);
    let parsed: { config: BuildingConfig; confirmation: string };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON.', raw },
        { status: 500 }
      );
    }

    if (!parsed.config || !parsed.confirmation) {
      return NextResponse.json(
        { error: 'AI response missing config or confirmation.', raw },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Design API error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
