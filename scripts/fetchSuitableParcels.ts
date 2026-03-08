/**
 * Fetch suitable development parcels from OpenStreetMap (parking lots, brownfield)
 * and write GeoJSON to public/map-data/suitable-parcels-{city}.geojson.
 * Parcels are filtered to have area >= 50 m² and include an `area` property.
 *
 * Run: npx tsx scripts/fetchSuitableParcels.ts
 * Or for one city: npx tsx scripts/fetchSuitableParcels.ts toronto
 */

import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'map-data');

const CITIES: Record<
  string,
  { bbox: [number, number, number, number]; name: string }
> = {
  toronto: {
    name: 'Toronto',
    bbox: [43.58, -79.64, 43.85, -79.12],
  },
  waterloo: {
    name: 'Waterloo',
    bbox: [43.4, -80.6, 43.5, -80.4],
  },
  mississauga: {
    name: 'Mississauga',
    bbox: [43.52, -79.72, 43.65, -79.55],
  },
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MIN_AREA_M2 = 50;

function buildOverpassQuery(bbox: [number, number, number, number]): string {
  const [south, west, north, east] = bbox;
  return `
[out:json][timeout:60];
(
  way["amenity"="parking"](${south},${west},${north},${east});
  way["landuse"="brownfield"](${south},${west},${north},${east});
  way["landuse"="construction"](${south},${west},${north},${east});
);
out body;
>;
out skel qt;
`.trim();
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

async function fetchOverpass(bbox: [number, number, number, number]): Promise<OverpassElement[]> {
  const query = buildOverpassQuery(bbox);
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'text/plain' },
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const json = await res.json();
  return json.elements || [];
}

function toGeoJSON(elements: OverpassElement[]): GeoJSON.FeatureCollection {
  const nodes = new Map<number, [number, number]>();
  elements.forEach((el) => {
    if (el.type === 'node' && el.lat != null && el.lon != null) {
      nodes.set(el.id, [el.lon, el.lat]);
    }
  });

  const features: GeoJSON.Feature[] = [];

  elements.forEach((el) => {
    if (el.type !== 'way' || !el.nodes) return;

    const coords: [number, number][] = [];
    for (const nodeId of el.nodes) {
      const c = nodes.get(nodeId);
      if (c) coords.push(c);
    }
    if (coords.length < 3) return;

    const ring = [...coords, coords[0]];
    const polygon = turf.polygon([ring]);
    let areaM2: number;
    try {
      areaM2 = turf.area(polygon);
    } catch {
      return;
    }
    if (areaM2 < MIN_AREA_M2) return;

    const tags = el.tags || {};
    const landuse = tags.landuse || tags.amenity || 'unknown';

    features.push({
      type: 'Feature',
      properties: {
        area: Math.round(areaM2),
        landuse,
        ...(tags.name && { name: tags.name }),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

async function run() {
  const cityArg = process.argv[2];
  const citiesToRun = cityArg
    ? [cityArg.toLowerCase()]
    : Object.keys(CITIES);

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  for (const cityId of citiesToRun) {
    const city = CITIES[cityId];
    if (!city) {
      console.warn(`Unknown city: ${cityId}`);
      continue;
    }
    console.log(`Fetching suitable parcels for ${city.name}...`);
    try {
      const elements = await fetchOverpass(city.bbox);
      const geojson = toGeoJSON(elements);
      const outPath = path.join(PUBLIC_DIR, `suitable-parcels-${cityId}.geojson`);
      fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf-8');
      console.log(`  Wrote ${geojson.features.length} features to ${outPath}`);
    } catch (err) {
      console.error(`  Error:`, err);
    }
  }
}

run();
