import { SimulateResult } from './types';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Seeded PRNG so simulation results are reproducible for the same inputs
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

type Severity = 'critical' | 'urgent' | 'non-urgent';

interface SimHospital {
  id: string;
  lat: number;
  lng: number;
  erBeds: number;
  occupancyPct: number;
}

interface Patient {
  lat: number;
  lng: number;
  severity: Severity;
  originId: string;
  assignedId: string;
}

const SEVERITY_DISTRIBUTION: [Severity, number][] = [
  ['critical', 0.15],
  ['urgent', 0.35],
  ['non-urgent', 0.50],
];

const STICKINESS: Record<Severity, number> = {
  'critical': 5.0,
  'urgent': 2.0,
  'non-urgent': 1.0,
};

const MAX_TRAVEL_MULTIPLIER: Record<Severity, number> = {
  'critical': 1.2,
  'urgent': 2.0,
  'non-urgent': Infinity,
};

const OVERFLOW_ROUNDS = 5;
const MIN_DIST_KM = 0.5;
const CAPACITY_FLOOR = 0.05;

function pickSeverity(rand: () => number): Severity {
  const r = rand();
  let cumulative = 0;
  for (const [sev, prob] of SEVERITY_DISTRIBUTION) {
    cumulative += prob;
    if (r < cumulative) return sev;
  }
  return 'non-urgent';
}

function capacityFactor(occupancyPct: number): number {
  return Math.max(CAPACITY_FLOOR, 1 - occupancyPct / 100);
}

function attractiveness(capFactor: number, distKm: number): number {
  const d = Math.max(MIN_DIST_KM, distKm);
  return capFactor / (d * d);
}

function generatePatients(simHospitals: SimHospital[], rand: () => number): Patient[] {
  const patients: Patient[] = [];
  for (const h of simHospitals) {
    if (h.id === 'proposed') continue;
    const patientCount = Math.round((h.occupancyPct / 100) * h.erBeds * 2);
    for (let i = 0; i < patientCount; i++) {
      const angle = rand() * 2 * Math.PI;
      const radius = Math.sqrt(rand()) * 0.05;
      patients.push({
        lat: h.lat + radius * Math.cos(angle),
        lng: h.lng + radius * Math.sin(angle) / Math.cos(h.lat * Math.PI / 180),
        severity: pickSeverity(rand),
        originId: h.id,
        assignedId: h.id,
      });
    }
  }
  return patients;
}

function assignPatients(
  patients: Patient[],
  simHospitals: SimHospital[],
  occupancy: Map<string, number>,
  rand: () => number,
): void {
  for (const p of patients) {
    const originDist = haversine(
      p.lat, p.lng,
      simHospitals.find(h => h.id === p.originId)!.lat,
      simHospitals.find(h => h.id === p.originId)!.lng,
    );
    const maxDist = originDist * MAX_TRAVEL_MULTIPLIER[p.severity];

    let totalWeight = 0;
    const candidates: Array<{ id: string; weight: number }> = [];

    for (const h of simHospitals) {
      const dist = haversine(p.lat, p.lng, h.lat, h.lng);
      if (dist > maxDist) continue;

      const occ = occupancy.get(h.id) ?? h.occupancyPct;
      let w = attractiveness(capacityFactor(occ), dist);

      if (h.id === p.originId) w *= STICKINESS[p.severity];

      candidates.push({ id: h.id, weight: w });
      totalWeight += w;
    }

    if (candidates.length === 0 || totalWeight === 0) continue;

    let pick = rand() * totalWeight;
    let chosen = candidates[candidates.length - 1].id;
    for (const c of candidates) {
      pick -= c.weight;
      if (pick <= 0) { chosen = c.id; break; }
    }
    p.assignedId = chosen;
  }
}

function rebalanceOverflow(
  patients: Patient[],
  simHospitals: SimHospital[],
  rand: () => number,
): Map<string, number> {
  const bedCap = new Map<string, number>();
  for (const h of simHospitals) bedCap.set(h.id, h.erBeds * 2);

  for (let round = 0; round < OVERFLOW_ROUNDS; round++) {
    const counts = new Map<string, number>();
    for (const h of simHospitals) counts.set(h.id, 0);
    for (const p of patients) counts.set(p.assignedId, (counts.get(p.assignedId) ?? 0) + 1);

    let anyOverflow = false;
    for (const h of simHospitals) {
      const cap = bedCap.get(h.id)!;
      const count = counts.get(h.id) ?? 0;
      if (count <= cap) continue;
      anyOverflow = true;

      const excess = count - cap;
      const assigned = patients.filter(p => p.assignedId === h.id);
      // Shuffle so eviction isn't biased by insertion order
      for (let i = assigned.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [assigned[i], assigned[j]] = [assigned[j], assigned[i]];
      }

      const toEvict = assigned.slice(0, excess);
      for (const p of toEvict) {
        let bestId = p.originId;
        let bestScore = -1;
        for (const alt of simHospitals) {
          if (alt.id === h.id) continue;
          const altCount = counts.get(alt.id) ?? 0;
          const altCap = bedCap.get(alt.id)!;
          if (altCount >= altCap) continue;
          const dist = haversine(p.lat, p.lng, alt.lat, alt.lng);
          const occ = Math.min(100, (altCount / altCap) * 100);
          const score = attractiveness(capacityFactor(occ), dist);
          if (score > bestScore) { bestScore = score; bestId = alt.id; }
        }
        counts.set(p.assignedId, (counts.get(p.assignedId) ?? 0) - 1);
        p.assignedId = bestId;
        counts.set(bestId, (counts.get(bestId) ?? 0) + 1);
      }
    }
    if (!anyOverflow) break;
  }

  const finalCounts = new Map<string, number>();
  for (const h of simHospitals) finalCounts.set(h.id, 0);
  for (const p of patients) finalCounts.set(p.assignedId, (finalCounts.get(p.assignedId) ?? 0) + 1);
  return finalCounts;
}

export function runSimulation(
  hospitals: any[],
  snapshots: any[],
  proposed: { lat: number; lng: number; capacity: number }
): SimulateResult {
  const rand = mulberry32(42);

  const occupancyMap = new Map<string, number>();
  const simHospitals: SimHospital[] = [];

  for (const h of hospitals) {
    const id = h._id.toString();
    const snap = snapshots.find((s: any) => s.hospitalId === id);
    const occ = snap?.occupancyPct ?? 70;
    occupancyMap.set(id, occ);
    simHospitals.push({
      id,
      lat: h.latitude,
      lng: h.longitude,
      erBeds: h.erBeds || 30,
      occupancyPct: occ,
    });
  }

  simHospitals.push({
    id: 'proposed',
    lat: proposed.lat,
    lng: proposed.lng,
    erBeds: proposed.capacity,
    occupancyPct: 0,
  });
  occupancyMap.set('proposed', 0);

  const patients = generatePatients(simHospitals, rand);

  assignPatients(patients, simHospitals, occupancyMap, rand);

  const finalCounts = rebalanceOverflow(patients, simHospitals, rand);

  const before: Record<string, number> = {};
  const after: Record<string, number> = {};
  const delta: Record<string, number> = {};

  for (const h of hospitals) {
    const id = h._id.toString();
    const beds = (h.erBeds || 30) * 2;
    before[id] = occupancyMap.get(id) ?? 70;
    after[id] = Math.min(100, Math.round(((finalCounts.get(id) ?? 0) / beds) * 100));
    delta[id] = after[id] - before[id];
  }

  const proposedBeds = proposed.capacity * 2;
  after['proposed'] = Math.min(100, Math.round(((finalCounts.get('proposed') ?? 0) / proposedBeds) * 100));

  return { before, after, delta };
}
