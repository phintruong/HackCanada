import { NextRequest, NextResponse } from 'next/server';
import { getHospitals } from '@/lib/clearpath/dataSource';

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city') ?? 'toronto';
  try {
    const { data, source } = await getHospitals(city);
    return NextResponse.json({ hospitals: data, source });
  } catch (e) {
    console.warn('Hospitals API error', e);
    return NextResponse.json({ hospitals: [], source: 'synthetic' });
  }
}
