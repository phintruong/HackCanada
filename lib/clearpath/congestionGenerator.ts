import type { CongestionSnapshot } from './types';
import type { ClearPathScenario } from './types';
import { getClearPathCityById } from './cities';
import { getHospitalId } from './hospitalId';
import { SCENARIO_PARAMS } from './scenarios';
import { createSeededRandom, getDefaultSeed, seedFromString } from './seedRandom';

export interface HospitalForCongestion {
  _id?: { toString: () => string } | string;
  id?: string;
  latitude: number;
  longitude: number;
  erBeds: number;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Round to current hour for deterministic demo (same hour = same snapshot). */
function getDeterministicRecordedAt(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

export function generateCongestion(
  hospitals: HospitalForCongestion[],
  city: string,
  scenario: ClearPathScenario = 'normal',
  seed?: number
): CongestionSnapshot[] {
  const config = getClearPathCityById(city);
  const [lngCenter, latCenter] = config ? config.center : [-79.38, 43.65];

  const effectiveSeed = seed ?? seedFromString(`congestion-${city}-${scenario}-${getDefaultSeed()}`);
  const rng = createSeededRandom(effectiveSeed);

  const params = SCENARIO_PARAMS[scenario];
  const spikeCount = params.spikeHospitalCount ?? 0;
  const spikeMin = params.spikeOccupancyMin ?? 92;
  const spikeMax = params.spikeOccupancyMax ?? 98;

  const withDistance = hospitals.map((h) => ({
    hospital: h,
    distKm: haversineKm(latCenter, lngCenter, h.latitude, h.longitude),
  }));
  const maxDist = Math.max(...withDistance.map((x) => x.distKm), 1);
  const sortedByDist = [...withDistance].sort((a, b) => a.distKm - b.distKm);
  const spikeIndices = new Set<number>();
  if (spikeCount > 0 && sortedByDist.length >= spikeCount) {
    for (let i = 0; i < spikeCount; i++) {
      const h = sortedByDist[i].hospital;
      const idx = hospitals.findIndex((x) => getHospitalId(x) === getHospitalId(h));
      if (idx >= 0) spikeIndices.add(idx);
    }
  }

  const recordedAt = getDeterministicRecordedAt();

  return hospitals.map((h, index) => {
    const hid = getHospitalId(h);
    const withD = withDistance.find((w) => getHospitalId(w.hospital) === hid);
    const distKm = withD?.distKm ?? 5;
    const downtownFactor = 1 - distKm / maxDist; // 1 at center, 0 at edge
    let baseOccupancy = 50 + downtownFactor * 35 + (rng() * 15 - 5);
    baseOccupancy = Math.max(45, Math.min(95, baseOccupancy));
    const isSpike = spikeCount > 0 && spikeIndices.has(index);
    const occupancyPct = isSpike
      ? spikeMin + rng() * (spikeMax - spikeMin)
      : Math.min(98, baseOccupancy * params.occupancyMultiplier + (rng() * 4 - 2));
    const clampedOccupancy = Math.max(40, Math.min(99, Math.round(occupancyPct)));

    const waitMinutes = Math.round(
      Math.max(20, 15 + (clampedOccupancy / 100) * 150 + params.waitMinutesOffset + (rng() * 20 - 10))
    );

    return {
      hospitalId: hid,
      occupancyPct: clampedOccupancy,
      waitMinutes,
      recordedAt,
    };
  });
}
