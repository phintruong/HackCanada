import type { Hospital } from './types';
import { getClearPathCityById } from './cities';
import { createSeededRandom, getDefaultSeed, seedFromString } from './seedRandom';

const HOSPITAL_NAME_PREFIXES: Record<string, string[]> = {
  toronto: ['Toronto General', 'St. Michael\'s', 'Sunnybrook', 'Mount Sinai', 'Toronto Western', 'Scarborough General', 'North York General', 'Humber River', 'East York Medical', 'Downtown Health'],
  kitchener: ['Grand River', 'St. Mary\'s', 'Kitchener General', 'Waterloo Regional', 'Freeport Health', 'Cambridge Memorial', 'Kitchener Downtown'],
  mississauga: ['Mississauga General', 'Credit Valley', 'Trillium Health', 'Queensway Health', 'Sheridan Park', 'Meadowvale Medical', 'Erin Mills Regional'],
};

export interface SyntheticHospital extends Hospital {
  id: string;
}

export function generateMockHospitals(
  city: string,
  seed?: number
): SyntheticHospital[] {
  const config = getClearPathCityById(city);
  if (!config) return [];

  const effectiveSeed = seed ?? seedFromString(`hospitals-${city}-${getDefaultSeed()}`);
  const rng = createSeededRandom(effectiveSeed);

  const [lngCenter, latCenter] = config.center;
  const radius = config.generationRadius;
  const count = 6 + Math.floor(rng() * 4); // 6-9 hospitals

  const prefixes = HOSPITAL_NAME_PREFIXES[city.toLowerCase()] ?? HOSPITAL_NAME_PREFIXES.toronto;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  const hospitals: SyntheticHospital[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    const angle = rng() * 2 * Math.PI;
    const r = radius * (0.2 + 0.8 * rng()); // some near center, some farther
    const lat = latCenter + r * Math.sin(angle);
    const lng = lngCenter + r * Math.cos(angle);

    const sizeRoll = rng();
    let erBeds: number;
    let totalBeds: number;
    if (sizeRoll < 0.3) {
      erBeds = 20 + Math.floor(rng() * 21);
      totalBeds = erBeds * (8 + Math.floor(rng() * 5));
    } else if (sizeRoll < 0.65) {
      erBeds = 40 + Math.floor(rng() * 26);
      totalBeds = erBeds * (6 + Math.floor(rng() * 4));
    } else {
      erBeds = 65 + Math.floor(rng() * 31);
      totalBeds = erBeds * (5 + Math.floor(rng() * 4));
    }
    totalBeds = Math.max(totalBeds, erBeds * 3);

    let name: string;
    const prefixIndex = Math.floor(rng() * prefixes.length);
    const base = prefixes[prefixIndex];
    name = base.endsWith('Hospital') ? base : `${base} Hospital`;
    if (usedNames.has(name)) name = `${cityName} ${base} Campus`;
    usedNames.add(name);

    const id = `synthetic-${city.toLowerCase()}-${i}`;
    hospitals.push({
      id,
      name,
      city: city.toLowerCase(),
      latitude: lat,
      longitude: lng,
      totalBeds,
      erBeds,
    });
  }

  return hospitals;
}
