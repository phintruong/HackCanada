import { NextRequest, NextResponse } from 'next/server';
import { classifyTriage } from '@/lib/clearpath/chatgptService';
import type { VitalsPayload, SymptomsPayload } from '@/lib/clearpath/types';

function isVitalsPayload(v: unknown): v is VitalsPayload {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.heartRate === 'number' &&
    typeof o.respiratoryRate === 'number' &&
    typeof o.stressIndex === 'number'
  );
}

function isSymptomsPayload(v: unknown): v is SymptomsPayload {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.chestPain === 'boolean' &&
    typeof o.shortnessOfBreath === 'boolean' &&
    typeof o.fever === 'boolean' &&
    typeof o.dizziness === 'boolean'
  );
}

function validateVitals(raw: VitalsPayload): VitalsPayload {
  if (raw.heartRate < 30 || raw.heartRate > 220)
    throw new Error('Heart rate out of valid range');
  if (raw.respiratoryRate < 5 || raw.respiratoryRate > 60)
    throw new Error('Respiratory rate out of valid range');
  if (raw.stressIndex < 0 || raw.stressIndex > 1)
    throw new Error('Stress index must be 0–1');
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const { vitals, symptoms, city } = body as Record<string, unknown>;

    if (vitals === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: vitals' },
        { status: 400 }
      );
    }
    if (!isVitalsPayload(vitals)) {
      return NextResponse.json(
        { error: 'Invalid vitals payload: must include heartRate, respiratoryRate, stressIndex as numbers' },
        { status: 400 }
      );
    }

    if (symptoms === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: symptoms' },
        { status: 400 }
      );
    }
    if (!isSymptomsPayload(symptoms)) {
      return NextResponse.json(
        { error: 'Invalid symptoms payload: must include chestPain, shortnessOfBreath, fever, dizziness as booleans' },
        { status: 400 }
      );
    }

    if (typeof city !== 'string' || city.trim() === '') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: city' },
        { status: 400 }
      );
    }

    const validatedVitals = validateVitals(vitals);
    const result = await classifyTriage(validatedVitals, symptoms);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (
      message.includes('Heart rate') ||
      message.includes('Respiratory rate') ||
      message.includes('Stress index')
    ) {
      return NextResponse.json(
        { error: message || 'Invalid vitals' },
        { status: 400 }
      );
    }
    console.error('Triage API error:', err);
    return NextResponse.json(
      { error: 'Triage classification failed. Please try again.' },
      { status: 500 }
    );
  }
}
