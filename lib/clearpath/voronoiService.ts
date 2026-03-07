import { SimulateResult } from './types';
import { getHospitalId } from './hospitalId';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function runSimulation(
  hospitals: any[],
  snapshots: any[],
  proposed: { lat: number; lng: number; capacity: number }
): SimulateResult {
  const loadMap: Record<string, number> = {};
  for (const h of hospitals) {
    const id = getHospitalId(h);
    const snap = snapshots.find((s: any) => s.hospitalId === id);
    loadMap[id] = snap?.occupancyPct ?? 70;
  }

  const patients: Array<{ lat: number; lng: number; severity: string; hospitalId: string }> = [];
  for (const h of hospitals) {
    const id = getHospitalId(h);
    const count = Math.round((loadMap[id] / 100) * h.erBeds * 2);
    for (let i = 0; i < count; i++) {
      patients.push({
        lat: h.latitude + (Math.random() - 0.5) * 0.1,
        lng: h.longitude + (Math.random() - 0.5) * 0.1,
        severity: Math.random() < 0.2 ? 'critical' : 'non-urgent',
        hospitalId: id
      });
    }
  }

  const allHospitals = [...hospitals, {
    _id: { toString: () => 'proposed' },
    id: 'proposed',
    latitude: proposed.lat,
    longitude: proposed.lng,
    erBeds: proposed.capacity
  }];

  const newCounts: Record<string, number> = {};
  for (const h of allHospitals) newCounts[getHospitalId(h)] = 0;

  for (const patient of patients) {
    const currentHospital = hospitals.find((h: any) => getHospitalId(h) === patient.hospitalId);
    const currentDist = haversine(
      patient.lat, patient.lng,
      currentHospital?.latitude ?? 0,
      currentHospital?.longitude ?? 0
    );
    const threshold = patient.severity === 'critical' ? 0.7 : 1.0;
    const nearest = allHospitals
      .map(h => ({ id: getHospitalId(h), dist: haversine(patient.lat, patient.lng, h.latitude, h.longitude) }))
      .filter(h => h.dist < currentDist * threshold)
      .sort((a, b) => a.dist - b.dist)[0];
    const assignedId = nearest?.id ?? patient.hospitalId;
    newCounts[assignedId] = (newCounts[assignedId] ?? 0) + 1;
  }

  const before: Record<string, number> = {};
  const after: Record<string, number> = {};
  const delta: Record<string, number> = {};
  for (const h of hospitals) {
    const id = getHospitalId(h);
    before[id] = loadMap[id];
    after[id] = Math.min(100, Math.round((newCounts[id] ?? 0) / (h.erBeds * 2) * 100));
    delta[id] = after[id] - before[id];
  }
  after['proposed'] = Math.min(100, Math.round((newCounts['proposed'] ?? 0) / (proposed.capacity * 2) * 100));
  return { before, after, delta };
}
