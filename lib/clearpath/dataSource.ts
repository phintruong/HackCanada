import type { CongestionSnapshot } from './types';
import type { ClearPathScenario } from './types';
import { getDbOrNull } from './mongoClient';
import { getHospitalId } from './hospitalId';
import { generateMockHospitals } from './generateMockHospitals';
import { generateCongestion } from './congestionGenerator';
import { congestionService } from './congestionService';

export type DataSource = 'real' | 'synthetic';

export interface HospitalLike {
  _id?: { toString: () => string } | string;
  id?: string;
  name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  totalBeds?: number;
  erBeds?: number;
  phone?: string;
  website?: string;
}

export async function getHospitals(city: string): Promise<{
  data: HospitalLike[];
  source: DataSource;
}> {
  const db = await getDbOrNull();
  if (!db) {
    const data = generateMockHospitals(city);
    return { data: data as HospitalLike[], source: 'synthetic' };
  }
  try {
    const docs = await db
      .collection('hospitals')
      .find({ city: city.toLowerCase() })
      .toArray();
    if (docs.length === 0) {
      const data = generateMockHospitals(city);
      return { data: data as HospitalLike[], source: 'synthetic' };
    }
    const data = docs.map((d: any) => ({
      ...d,
      id: getHospitalId(d),
    }));
    return { data, source: 'real' };
  } catch {
    const data = generateMockHospitals(city);
    return { data: data as HospitalLike[], source: 'synthetic' };
  }
}

export async function getCongestion(
  city: string,
  scenario?: ClearPathScenario
): Promise<{ data: CongestionSnapshot[]; source: DataSource }> {
  const { data: hospitals, source: hospitalsSource } = await getHospitals(city);
  const scenarioKey = scenario ?? 'normal';

  const db = await getDbOrNull();
  if (db && hospitalsSource === 'real' && hospitals.length > 0) {
    const ids = hospitals.map((h) => getHospitalId(h));
    const snapshots = await db
      .collection('congestion_snapshots')
      .find({ hospitalId: { $in: ids } })
      .sort({ recordedAt: -1 })
      .toArray();
    const byHospital = new Map<string, any>();
    for (const s of snapshots) {
      if (!byHospital.has(s.hospitalId)) byHospital.set(s.hospitalId, s);
    }
    const data: CongestionSnapshot[] = ids.map((id) => {
      const s = byHospital.get(id);
      if (s)
        return {
          hospitalId: s.hospitalId,
          occupancyPct: s.occupancyPct,
          waitMinutes: s.waitMinutes,
          recordedAt: s.recordedAt instanceof Date ? s.recordedAt : new Date(s.recordedAt),
        };
      return {
        hospitalId: id,
        occupancyPct: 70,
        waitMinutes: 60,
        recordedAt: new Date(),
      };
    });
    if (data.length > 0) return { data, source: 'real' };
    try {
      await congestionService.getCongestion(city);
      const again = await db
        .collection('congestion_snapshots')
        .find({ hospitalId: { $in: ids } })
        .sort({ recordedAt: -1 })
        .toArray();
      const byH2 = new Map<string, any>();
      for (const s of again) {
        if (!byH2.has(s.hospitalId)) byH2.set(s.hospitalId, s);
      }
      const data2: CongestionSnapshot[] = ids.map((id) => {
        const s = byH2.get(id);
        if (s)
          return {
            hospitalId: s.hospitalId,
            occupancyPct: s.occupancyPct,
            waitMinutes: s.waitMinutes,
            recordedAt: s.recordedAt instanceof Date ? s.recordedAt : new Date(s.recordedAt),
          };
        return {
          hospitalId: id,
          occupancyPct: 70,
          waitMinutes: 60,
          recordedAt: new Date(),
        };
      });
      return { data: data2, source: 'real' };
    } catch {
      // fall through to synthetic
    }
  }

  const data = generateCongestion(
    hospitals as any,
    city,
    scenarioKey as ClearPathScenario
  );
  return { data, source: 'synthetic' };
}
