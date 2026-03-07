import { NextRequest, NextResponse } from 'next/server';
import { runSimulation } from '@/lib/clearpath/voronoiService';
import { getHospitals, getCongestion } from '@/lib/clearpath/dataSource';
import { SimulateRequest } from '@/lib/clearpath/types';

export async function POST(req: NextRequest) {
  const body: SimulateRequest = await req.json();
  const scenario = body.scenario ?? 'normal';
  const [{ data: hospitals }, { data: snapshots, source }] = await Promise.all([
    getHospitals(body.city),
    getCongestion(body.city, scenario),
  ]);

  const result = runSimulation(hospitals, snapshots, {
    lat: body.proposedLat,
    lng: body.proposedLng,
    capacity: body.proposedCapacity
  });

  return NextResponse.json({ ...result, source });
}
