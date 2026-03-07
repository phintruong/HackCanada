import { SimulateResult } from './types';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Only hospitals within this radius (km) are affected by the proposed hospital.
const MAX_EFFECT_RADIUS_KM = 100;

// Base diversion rate – the theoretical maximum fraction of a hospital's
// patients that would be diverted to a new hospital at distance 0 with the
// same bed capacity.
const BASE_DIVERSION_RATE = 0.30;

// Distance-decay function (logarithmic)
// Returns a value in [0, 1] representing how strongly the proposed hospital
// affects an existing hospital at `distKm` kilometres away.
function distanceDecay(distKm: number): number {
  if (distKm >= MAX_EFFECT_RADIUS_KM) return 0;
  return Math.max(0, 1 - Math.log(1 + distKm) / Math.log(1 + MAX_EFFECT_RADIUS_KM));
}

interface SimHospital {
  id: string;
  lat: number;
  lng: number;
  erBeds: number;
  occupancyPct: number;
}

interface Diversion {
  id: string;
  currentPatients: number;
  diverted: number;
}

// Deterministic Patient Diversion Model
// When a new hospital is placed, some fraction of patients from each
// existing hospital within range will choose the new hospital instead.
export function runSimulation(
  hospitals: any[],
  snapshots: any[],
  proposed: { lat: number; lng: number; capacity: number }
): SimulateResult {
  // 1. Build hospital list with current occupancy
  const simHospitals: SimHospital[] = [];

  for (const h of hospitals) {
    const id = h._id.toString();
    const snap = snapshots.find((s: any) => s.hospitalId === id);
    const occ = snap?.occupancyPct ?? 70;
    simHospitals.push({
      id,
      lat: h.latitude,
      lng: h.longitude,
      erBeds: h.erBeds || 30,
      occupancyPct: occ,
    });
  }

  const proposedBeds = proposed.capacity;
  const proposedTotalBeds = proposedBeds * 2;

  // 2. Calculate diversion per hospital
  const diversions: Diversion[] = [];

  for (const h of simHospitals) {
    const dist = haversine(h.lat, h.lng, proposed.lat, proposed.lng);
    const decay = distanceDecay(dist);
    const totalBeds = h.erBeds * 2;
    const currentPatients = (h.occupancyPct / 100) * totalBeds;

    if (decay === 0) {
      diversions.push({ id: h.id, currentPatients, diverted: 0 });
      continue;
    }

    const capFactor = proposedBeds / (proposedBeds + h.erBeds);
    const diversionRate = BASE_DIVERSION_RATE * decay * capFactor;
    const diverted = diversionRate * currentPatients;

    diversions.push({ id: h.id, currentPatients, diverted });
  }

  // 3. Cap total diverted at proposed capacity
  const totalDiverted = diversions.reduce((sum, d) => sum + d.diverted, 0);
  let scaleFactor = 1;
  if (totalDiverted > proposedTotalBeds) {
    scaleFactor = proposedTotalBeds / totalDiverted;
  }

  // 4. Compute before / after / delta
  const before: Record<string, number> = {};
  const after: Record<string, number> = {};
  const delta: Record<string, number> = {};

  for (const h of simHospitals) {
    const d = diversions.find(x => x.id === h.id)!;
    const totalBeds = h.erBeds * 2;
    const actualDiverted = d.diverted * scaleFactor;
    const newPatients = d.currentPatients - actualDiverted;

    before[h.id] = h.occupancyPct;
    after[h.id] = Math.max(0, Math.min(100, Math.round((newPatients / totalBeds) * 100)));
    delta[h.id] = after[h.id] - before[h.id];
  }

  const actualTotal = totalDiverted * scaleFactor;
  after['proposed'] = Math.min(100, Math.round((actualTotal / proposedTotalBeds) * 100));

  return { before, after, delta };
}
