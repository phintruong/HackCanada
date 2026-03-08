'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { getFirstSymbolLayerId } from '@/lib/mapbox/createMap';
import type { SimulateResult } from '@/lib/clearpath/types';
import type { ProposedBuilding } from '@/lib/clearpath/blueprints';

interface SimulatedTrafficOverlayProps {
  map: mapboxgl.Map | null;
  simulationResult: SimulateResult | null;
  hospitals: Array<{
    _id?: { toString: () => string };
    id?: string;
    latitude?: number;
    longitude?: number;
    erBeds?: number;
  }>;
  proposedLocations: ProposedBuilding[];
}

const TRAFFIC_SOURCE = 'clearpath-traffic-src';
const SIM_PREFIX = 'sim-traffic';

const ROAD_CLASSES = [
  { id: 'motorway', filter: ['==', 'class', 'motorway'], width: 5, minzoom: 6 },
  { id: 'trunk', filter: ['==', 'class', 'trunk'], width: 4.5, minzoom: 8 },
  { id: 'primary', filter: ['==', 'class', 'primary'], width: 4, minzoom: 9 },
  { id: 'secondary', filter: ['==', 'class', 'secondary'], width: 3, minzoom: 10 },
  { id: 'tertiary', filter: ['==', 'class', 'tertiary'], width: 2.5, minzoom: 11 },
  { id: 'street', filter: ['==', 'class', 'street'], width: 2, minzoom: 13 },
];

function getColorForOccupancy(occ: number): string {
  if (occ < 40) return '#22c55e'; // green — low congestion
  if (occ < 70) return '#eab308'; // yellow — moderate
  return '#dc2626';               // red — heavy
}

function createCirclePolygon(
  lng: number,
  lat: number,
  radiusKm: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  return turf.circle([lng, lat], radiusKm, { units: 'kilometers', steps: 64 });
}

export default function SimulatedTrafficOverlay({
  map,
  simulationResult,
  hospitals,
  proposedLocations,
}: SimulatedTrafficOverlayProps) {
  const layersRef = useRef<string[]>([]);
  const sourcesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!map) return;

    function cleanup() {
      if (!map) return;
      try {
        for (const lid of layersRef.current) {
          if (map.getLayer(lid)) map.removeLayer(lid);
        }
        for (const sid of sourcesRef.current) {
          if (map.getSource(sid)) map.removeSource(sid);
        }
      } catch {
        /* map may be destroyed */
      }
      layersRef.current = [];
      sourcesRef.current = [];
    }

    cleanup();

    if (!simulationResult) return;

    function addSimLayers() {
      if (!map || !simulationResult) return;

      // Ensure the shared Mapbox traffic vector source exists
      if (!map.getSource(TRAFFIC_SOURCE)) {
        map.addSource(TRAFFIC_SOURCE, {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1',
        });
      }

      const { after, delta, proposedAfter } = simulationResult;
      const beforeId = getFirstSymbolLayerId(map);

      // Group hospital impact zones by post-simulation color
      const colorGroups: Record<string, GeoJSON.Feature<GeoJSON.Polygon>[]> = {
        '#22c55e': [],
        '#eab308': [],
        '#dc2626': [],
      };

      for (const h of hospitals) {
        const hId = h._id?.toString() ?? h.id ?? '';
        const d = delta[hId];
        if (d === undefined || d >= 0) continue; // only show improvements

        const lat = h.latitude;
        const lng = h.longitude;
        if (!lat || !lng) continue;

        const afterOcc = after[hId] ?? 70;
        const color = getColorForOccupancy(afterOcc);
        // Impact radius scales with magnitude of improvement (1.5 – 4 km)
        const radius = Math.min(4, Math.max(1.5, Math.abs(d) / 8));
        colorGroups[color].push(createCirclePolygon(lng, lat, radius));
      }

      // Add zones around proposed hospitals
      if (proposedAfter) {
        proposedLocations.forEach((loc, i) => {
          const key = `proposed-${i}`;
          const occ = proposedAfter[key];
          if (occ === undefined) return;

          const color = getColorForOccupancy(occ);
          colorGroups[color].push(createCirclePolygon(loc.lng, loc.lat, 2.5));
        });
      }

      // For each color group, merge circles and overlay traffic roads
      for (const [color, circles] of Object.entries(colorGroups)) {
        if (circles.length === 0) continue;

        let zone: GeoJSON.Feature | null = null;
        if (circles.length === 1) {
          zone = circles[0];
        } else {
          const fc = turf.featureCollection(circles);
          zone = turf.union(fc) as GeoJSON.Feature;
        }
        if (!zone || !zone.geometry) continue;

        const colorKey = color.replace('#', '');

        // Subtle fill showing the impact area
        const zoneSrcId = `${SIM_PREFIX}-zone-${colorKey}`;
        map.addSource(zoneSrcId, { type: 'geojson', data: zone });
        sourcesRef.current.push(zoneSrcId);

        const zoneFillId = `${SIM_PREFIX}-fill-${colorKey}`;
        map.addLayer(
          {
            id: zoneFillId,
            type: 'fill',
            source: zoneSrcId,
            paint: {
              'fill-color': color,
              'fill-opacity': 0.1,
            },
          },
          beforeId,
        );
        layersRef.current.push(zoneFillId);

        // Dashed boundary ring
        const zoneRingId = `${SIM_PREFIX}-ring-${colorKey}`;
        map.addLayer(
          {
            id: zoneRingId,
            type: 'line',
            source: zoneSrcId,
            paint: {
              'line-color': color,
              'line-width': 1.5,
              'line-opacity': 0.5,
              'line-dasharray': [4, 3],
            },
          },
          beforeId,
        );
        layersRef.current.push(zoneRingId);

        // Override road colors within the zone using the Mapbox traffic source
        for (const road of ROAD_CLASSES) {
          const layerId = `${SIM_PREFIX}-${colorKey}-${road.id}`;
          map.addLayer(
            {
              id: layerId,
              type: 'line',
              source: TRAFFIC_SOURCE,
              'source-layer': 'traffic',
              filter: [
                'all',
                road.filter,
                ['within', zone.geometry],
              ] as any,
              minzoom: road.minzoom,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': color,
                'line-width': road.width,
                'line-opacity': 0.85,
              },
            } as any,
            beforeId,
          );
          layersRef.current.push(layerId);
        }
      }
    }

    if (map.isStyleLoaded()) {
      addSimLayers();
    } else {
      map.once('style.load', addSimLayers);
    }

    return cleanup;
  }, [map, simulationResult, hospitals, proposedLocations]);

  return null;
}
