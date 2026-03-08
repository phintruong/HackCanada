import { NextRequest, NextResponse } from 'next/server';
import { runSimulation } from '@/lib/clearpath/voronoiService';
import { getDb } from '@/lib/clearpath/mongoClient';
import { SimulateRequest } from '@/lib/clearpath/types';

export async function POST(req: NextRequest) {
  const body: SimulateRequest = await req.json();
  const db = await getDb();

  const hospitals = await db.collection('hospitals')
    .find({ city: body.city }).toArray();
  const snapshots = await db.collection('congestion_snapshots')
    .find({ hospitalId: { $in: hospitals.map(h => h._id.toString()) } })
    .sort({ recordedAt: -1 }).toArray();

  const proposals = body.proposals ?? [];
  const result = runSimulation(hospitals, snapshots, proposals);

  return NextResponse.json(result);
}
