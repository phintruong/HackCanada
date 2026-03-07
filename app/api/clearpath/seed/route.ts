import { NextResponse } from 'next/server';
import { getDb } from '@/lib/clearpath/mongoClient';
import { mockHospitals, mockCongestion } from '@/lib/clearpath/mockData';

export async function POST() {
  const db = await getDb();

  // Clear existing data
  await db.collection('hospitals').deleteMany({});
  await db.collection('congestion_snapshots').deleteMany({});

  // Insert hospitals
  const hospitalResult = await db.collection('hospitals').insertMany(mockHospitals);

  // Map old string IDs to new MongoDB ObjectIds for congestion snapshots
  const insertedHospitals = await db.collection('hospitals').find({}).toArray();
  const congestionDocs = insertedHospitals.map(h => ({
    hospitalId: h._id.toString(),
    occupancyPct: Math.round(Math.random() * 40 + 50),
    waitMinutes: Math.floor(Math.random() * 180 + 60),
    recordedAt: new Date(),
  }));

  await db.collection('congestion_snapshots').insertMany(congestionDocs);

  return NextResponse.json({
    message: 'Seeded successfully',
    hospitals: hospitalResult.insertedCount,
    congestion: congestionDocs.length,
  });
}
