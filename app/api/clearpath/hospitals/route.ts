import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/clearpath/mongoClient';

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city') ?? 'toronto';
  try {
    const db = await getDb();
    const hospitals = await db.collection('hospitals')
      .find({ city: city.toLowerCase() })
      .toArray();
    return NextResponse.json(hospitals);
  } catch (e) {
    console.warn('Hospitals API: DB unavailable', e);
    return NextResponse.json([]);
  }
}
