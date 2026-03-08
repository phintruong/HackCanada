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

interface Proposal {
  lat: number;
  lng: number;
  capacity: number;
  id: string;
}

// Deterministic Patient Diversion Model
// When new hospitals are placed, patients divert from existing hospitals.
// With multiple proposals, diversion is split by distance and capacity.
export function runSimulation(
  hospitals: any[],
  snapshots: any[],
  proposals: { lat: number; lng: number; capacity: number }[]
): SimulateResult {
  if (proposals.length === 0) {
    const before: Record<string, number> = {};
    const after: Record<string, number> = {};
    const delta: Record<string, number> = {};
    for (const h of hospitals) {
      const id = h._id.toString();
      const snap = snapshots.find((s: any) => s.hospitalId === id);
      const occ = snap?.occupancyPct ?? 70;
      before[id] = occ;
      after[id] = occ;
      delta[id] = 0;
    }
    return { before, after, delta };
  }

  const props: Proposal[] = proposals.map((p, i) => ({
    ...p,
    id: `proposed-${i}`,
  }));

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

  // rawDiversion[H][P] = patients diverted from H to proposal P
  const rawDiversion: Record<string, Record<string, number>> = {};
  for (const h of simHospitals) {
    rawDiversion[h.id] = {};
    const totalBeds = h.erBeds * 2;
    const currentPatients = (h.occupancyPct / 100) * totalBeds;

    for (const p of props) {
      const dist = haversine(h.lat, h.lng, p.lat, p.lng);
      const decay = distanceDecay(dist);
      if (decay === 0) {
        rawDiversion[h.id][p.id] = 0;
        continue;
      }
      const capFactor = p.capacity / (p.capacity + h.erBeds);
      const rate = BASE_DIVERSION_RATE * decay * capFactor;
      rawDiversion[h.id][p.id] = rate * currentPatients;
    }
  }

  // Scale per hospital: total diverted from H <= currentPatients(H)
  const div1: Record<string, Record<string, number>> = {};
  for (const h of simHospitals) {
    div1[h.id] = {};
    const totalBeds = h.erBeds * 2;
    const currentPatients = (h.occupancyPct / 100) * totalBeds;
    const totalRaw = props.reduce((s, p) => s + (rawDiversion[h.id][p.id] ?? 0), 0);
    const scale = totalRaw > 0 && totalRaw > currentPatients ? currentPatients / totalRaw : 1;
    for (const p of props) {
      div1[h.id][p.id] = (rawDiversion[h.id][p.id] ?? 0) * scale;
    }
  }

  // Scale per proposal: total received by P <= cap(P)
  const actualDiversion: Record<string, Record<string, number>> = {};
  for (const h of simHospitals) {
    actualDiversion[h.id] = {};
    for (const p of props) {
      actualDiversion[h.id][p.id] = div1[h.id][p.id];
    }
  }
  for (const p of props) {
    const received = simHospitals.reduce((s, h) => s + div1[h.id][p.id], 0);
    const cap = p.capacity * 2;
    if (received > cap && received > 0) {
      const scale = cap / received;
      for (const h of simHospitals) {
        actualDiversion[h.id][p.id] *= scale;
      }
    }
  }

  const before: Record<string, number> = {};
  const after: Record<string, number> = {};
  const delta: Record<string, number> = {};
  const proposedAfter: Record<string, number> = {};

  for (const h of simHospitals) {
    const totalBeds = h.erBeds * 2;
    const currentPatients = (h.occupancyPct / 100) * totalBeds;
    const totalDiverted = props.reduce((s, p) => s + (actualDiversion[h.id][p.id] ?? 0), 0);
    const newPatients = Math.max(0, currentPatients - totalDiverted);

    before[h.id] = h.occupancyPct;
    after[h.id] = Math.max(0, Math.min(100, Math.round((newPatients / totalBeds) * 100)));
    delta[h.id] = after[h.id] - before[h.id];
  }

  for (const p of props) {
    const received = simHospitals.reduce((s, h) => s + (actualDiversion[h.id][p.id] ?? 0), 0);
    const cap = p.capacity * 2;
    proposedAfter[p.id] = Math.min(100, Math.round((received / cap) * 100));
  }

  return { before, after, delta, proposedAfter };
}
