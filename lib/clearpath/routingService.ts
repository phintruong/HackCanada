import { RouteResponse } from './types';
import { getHospitalId } from './hospitalId';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function recommendHospital(
  userLat: number,
  userLng: number,
  severity: string,
  hospitals: any[],
  snapshots: any[]
): RouteResponse {
  const loadMap: Record<string, number> = {};
  for (const s of snapshots) loadMap[s.hospitalId] = s.occupancyPct;

  const withDist = hospitals.map(h => ({
    ...h,
    distanceKm: haversine(userLat, userLng, h.latitude, h.longitude),
    occupancy: loadMap[getHospitalId(h)] ?? 70
  }));

  let chosen: any;
  let reason = '';

  if (severity === 'critical') {
    chosen = withDist.sort((a, b) => a.distanceKm - b.distanceKm)[0];
    reason = 'Nearest ER selected — your condition requires immediate care.';
  } else if (severity === 'urgent') {
    chosen = withDist.filter(h => h.occupancy < 80)
      .sort((a, b) => a.distanceKm - b.distanceKm)[0]
      ?? withDist.sort((a, b) => a.distanceKm - b.distanceKm)[0];
    reason = 'Nearest ER with available capacity selected for same-day care.';
  } else {
    chosen = withDist.filter(h => h.distanceKm < 30)
      .sort((a, b) => a.occupancy - b.occupancy)[0];
    reason = 'Least congested ER within 30km — your condition is non-urgent.';
  }

  const chosenId = chosen ? getHospitalId(chosen) : '';
  const snap = snapshots.find((s: any) => s.hospitalId === chosenId);
  return {
    hospital: chosen,
    distanceKm: chosen ? Math.round(chosen.distanceKm * 10) / 10 : 0,
    waitMinutes: snap?.waitMinutes ?? 0,
    reason
  };
}
