/**
 * ClearPath city metadata: single source of truth for synthetic data generators.
 * Distinct from lib/map-3d/cities.ts (map config). Centers aligned with map for consistency.
 */

export interface ClearPathCityConfig {
  id: string;
  /** [longitude, latitude] to match Mapbox */
  center: [number, number];
  /** Radius in degrees for placing hospitals and demand (e.g. 0.08 ~ 8km) */
  generationRadius: number;
  /** Optional relative weight for demand/congestion baseline (e.g. 1.0 = Toronto) */
  populationWeight?: number;
}

export const CLEARPATH_CITIES: ClearPathCityConfig[] = [
  {
    id: 'toronto',
    center: [-79.3832, 43.6532],
    generationRadius: 0.12,
    populationWeight: 1.0,
  },
  {
    id: 'kitchener',
    center: [-80.4922, 43.4516],
    generationRadius: 0.08,
    populationWeight: 0.25,
  },
  {
    id: 'mississauga',
    center: [-79.6441, 43.589],
    generationRadius: 0.09,
    populationWeight: 0.5,
  },
];

export function getClearPathCityById(id: string): ClearPathCityConfig | undefined {
  return CLEARPATH_CITIES.find((c) => c.id === id.toLowerCase());
}

export function getClearPathCityIds(): string[] {
  return CLEARPATH_CITIES.map((c) => c.id);
}
