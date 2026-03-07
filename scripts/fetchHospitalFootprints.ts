/**
 * Fetch hospital building footprints from OpenStreetMap (Overpass) and write
 * GeoJSON to public/map-data/hospital-footprints-{city}.geojson.
 *
 * Height fallback: height = (OSM "height" tag) OR (building:levels * 3) OR 12 (metres).
 *
 * Run: npx tsx scripts/fetchHospitalFootprints.ts
 * Or for one city: npx tsx scripts/fetchHospitalFootprints.ts toronto
 */

import * as fs from 'fs';
import * as path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'map-data');

const CITIES: Record<
  string,
  { bbox: [number, number, number, number]; name: string }
> = {
  toronto: {
    name: 'Toronto',
    bbox: [43.58, -79.64, 43.85, -79.12],
  },
  kitchener: {
    name: 'Kitchener',
    bbox: [43.4, -80.6, 43.5, -80.4],
  },
  mississauga: {
    name: 'Mississauga',
    bbox: [43.52, -79.72, 43.65, -79.55],
  },
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function heightFromTags(tags: Record<string, string>): number {
  if (tags.height) {
    const m = tags.height.toString().match(/[\d.]+/);
    if (m) {
      const v = parseFloat(m[0]);
      if (!isNaN(v) && v > 0) return v;
    }
  }
  if (tags['building:levels']) {
    const levels = parseInt(tags['building:levels'], 10);
    if (!isNaN(levels) && levels > 0) return levels * 3;
  }
  return 12;
}

function buildOverpassQuery(bbox: [number, number, number, number]): string {
  const [south, west, north, east] = bbox;
  return `
[out:json][timeout:60];
(
  way["amenity"="hospital"](${south},${west},${north},${east});
  way["healthcare"="hospital"](${south},${west},${north},${east});
  way["building"="hospital"](${south},${west},${north},${east});
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
    if (el.type !== 'way' || !el.nodes || !el.tags) return;

    const coords: [number, number][] = [];
    for (const nodeId of el.nodes) {
      const c = nodes.get(nodeId);
      if (c) coords.push(c);
    }
    if (coords.length < 3) return;

    const height = heightFromTags(el.tags);
    const name = el.tags.name || undefined;

    features.push({
      type: 'Feature',
      properties: {
        height,
        min_height: 0,
        ...(name && { name }),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[...coords, coords[0]]],
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
    console.log(`Fetching hospital footprints for ${city.name}...`);
    try {
      const elements = await fetchOverpass(city.bbox);
      const geojson = toGeoJSON(elements);
      const outPath = path.join(PUBLIC_DIR, `hospital-footprints-${cityId}.geojson`);
      fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf-8');
      console.log(`  Wrote ${geojson.features.length} features to ${outPath}`);
    } catch (err) {
      console.error(`  Error:`, err);
    }
  }
}

run();
