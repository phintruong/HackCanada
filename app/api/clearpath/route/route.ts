import { NextRequest, NextResponse } from 'next/server';
import { recommendHospital } from '@/lib/clearpath/routingService';
import { getHospitals, getCongestion } from '@/lib/clearpath/dataSource';
import { RouteRequest } from '@/lib/clearpath/types';

export async function POST(req: NextRequest) {
  const body: RouteRequest = await req.json();
  const [{ data: hospitals }, { data: snapshots, source }] = await Promise.all([
    getHospitals(body.city),
    getCongestion(body.city),
  ]);

  const recommendation = recommendHospital(
    body.userLat, body.userLng, body.severity, hospitals, snapshots
  );
  return NextResponse.json({ ...recommendation, source });
}
