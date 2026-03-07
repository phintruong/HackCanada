/**
 * Synthetic patient demand for simulation and future heatmap visualization.
 * More demand near downtown; severity mix tunable by scenario.
 * Phase 2: ready for heatmap and optional simulation input.
 */

import type { ClearPathScenario } from './types';
import { getClearPathCityById } from './cities';
import { createSeededRandom, getDefaultSeed, seedFromString } from './seedRandom';

export type DemandSeverity = 'critical' | 'urgent' | 'non-urgent';

export interface PatientDemandPoint {
  lat: number;
  lng: number;
  severity: DemandSeverity;
}

export interface PatientDemandResult {
  points: PatientDemandPoint[];
  /** Optional: count per severity for summaries */
  bySeverity: Record<DemandSeverity, number>;
}

/** Severity mix [critical, urgent, non-urgent] as approximate fractions (sum = 1). */
const SEVERITY_BY_SCENARIO: Record<ClearPathScenario, [number, number, number]> = {
  normal: [0.15, 0.25, 0.6],
  flu_season: [0.08, 0.22, 0.7],
  weekend_surge: [0.12, 0.28, 0.6],
  mass_casualty: [0.35, 0.35, 0.3],
};

const SEVERITIES: DemandSeverity[] = ['critical', 'urgent', 'non-urgent'];

export function generatePatientDemand(
  city: string,
  options?: {
    scenario?: ClearPathScenario;
    seed?: number;
    /** Approximate number of demand points (default scales by population weight). */
    count?: number;
  }
): PatientDemandResult {
  const config = getClearPathCityById(city);
  const [lngCenter, latCenter] = config?.center ?? [-79.3832, 43.6532];
  const radius = config?.generationRadius ?? 0.1;
  const populationWeight = config?.populationWeight ?? 1;

  const scenario = options?.scenario ?? 'normal';
  const effectiveSeed = options?.seed ?? seedFromString(`demand-${city}-${scenario}-${getDefaultSeed()}`);
  const rng = createSeededRandom(effectiveSeed);

  const baseCount = Math.round(80 * populationWeight * (0.8 + 0.4 * rng()));
  const count = options?.count ?? baseCount;

  const [pCritical, pUrgent, pNonUrgent] = SEVERITY_BY_SCENARIO[scenario];

  const points: PatientDemandPoint[] = [];
  const bySeverity: Record<DemandSeverity, number> = {
    critical: 0,
    urgent: 0,
    'non-urgent': 0,
  };

  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt(rng());
    const angle = rng() * 2 * Math.PI;
    const lat = latCenter + r * Math.sin(angle);
    const lng = lngCenter + r * Math.cos(angle);

    const roll = rng();
    let severity: DemandSeverity;
    if (roll < pCritical) {
      severity = 'critical';
    } else if (roll < pCritical + pUrgent) {
      severity = 'urgent';
    } else {
      severity = 'non-urgent';
    }
    bySeverity[severity]++;
    points.push({ lat, lng, severity });
  }

  return { points, bySeverity };
}

/**
 * Aggregate demand into a simple grid for heatmap use (count per cell).
 * Returns array of { lat, lng, count } for cells that have demand.
 */
export function demandToHeatmapCells(
  points: PatientDemandPoint[],
  cellSizeDegrees: number = 0.01
): Array<{ lat: number; lng: number; count: number }> {
  const cellKey = (lat: number, lng: number) =>
    `${Math.floor(lat / cellSizeDegrees)},${Math.floor(lng / cellSizeDegrees)}`;
  const cells = new Map<string, { lat: number; lng: number; count: number }>();

  for (const p of points) {
    const latCell = Math.floor(p.lat / cellSizeDegrees) * cellSizeDegrees + cellSizeDegrees / 2;
    const lngCell = Math.floor(p.lng / cellSizeDegrees) * cellSizeDegrees + cellSizeDegrees / 2;
    const key = cellKey(p.lat, p.lng);
    const existing = cells.get(key);
    if (existing) {
      existing.count++;
    } else {
      cells.set(key, { lat: latCell, lng: lngCell, count: 1 });
    }
  }
  return Array.from(cells.values());
}
