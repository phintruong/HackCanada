import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function GET() {
  return NextResponse.json({ sessionId: randomUUID() });
}

export async function POST() {
  return NextResponse.json({ sessionId: randomUUID() });
}
