import { NextRequest, NextResponse } from 'next/server';
import { getCongestion } from '@/lib/clearpath/dataSource';
import type { ClearPathScenario } from '@/lib/clearpath/types';

const VALID_SCENARIOS: ClearPathScenario[] = ['normal', 'flu_season', 'weekend_surge', 'mass_casualty'];

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city') ?? 'toronto';
  const scenarioParam = req.nextUrl.searchParams.get('scenario') ?? 'normal';
  const scenario: ClearPathScenario = VALID_SCENARIOS.includes(scenarioParam as ClearPathScenario)
    ? (scenarioParam as ClearPathScenario)
    : 'normal';
  try {
    const { data, source } = await getCongestion(city, scenario);
    return NextResponse.json({ congestion: data, source });
  } catch (e) {
    console.warn('Congestion API error', e);
    return NextResponse.json({ congestion: [], source: 'synthetic' });
  }
}
