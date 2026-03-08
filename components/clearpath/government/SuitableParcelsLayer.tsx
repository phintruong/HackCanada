'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { getFirstSymbolLayerId } from '@/lib/mapbox/createMap';
import type { Blueprint } from '@/lib/clearpath/blueprints';

const SOURCE_ID = 'suitable-parcels';
const FILL_LAYER_ID = 'suitable-parcels-fill';
const LINE_LAYER_ID = 'suitable-parcels-line';

interface SuitableParcelsLayerProps {
  map: mapboxgl.Map | null;
  cityId: string;
  blueprint: Blueprint;
}

export default function SuitableParcelsLayer({ map, cityId, blueprint }: SuitableParcelsLayerProps) {
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const key = `${cityId}:${blueprint.id}`;
    prevKeyRef.current = key;

    const beforeLayerId = getFirstSymbolLayerId(map);

    let cancelled = false;

    async function load() {
      if (!map) return;
      try {
        const res = await fetch(`/map-data/suitable-parcels-${cityId}.geojson`);
        if (!res.ok || cancelled) return;
        const data: GeoJSON.FeatureCollection = await res.json();

        const filtered: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: data.features.filter(
            (f) => (f.properties?.area ?? 0) >= blueprint.minAreaM2
          ),
        };

        if (cancelled) return;

        const existing = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
        if (existing) {
          existing.setData(filtered);
          return;
        }

        map.addSource(SOURCE_ID, { type: 'geojson', data: filtered });

        map.addLayer(
          {
            id: FILL_LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color': '#22d3ee',
              'fill-opacity': 0.25,
            },
          },
          beforeLayerId
        );

        map.addLayer(
          {
            id: LINE_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': '#06b6d4',
              'line-width': 2,
              'line-opacity': 0.8,
            },
          },
          beforeLayerId
        );
      } catch {
        // GeoJSON may not exist for this city
      }
    }

    load();

    return () => {
      cancelled = true;
      if (!map) return;
      try {
        if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
        if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Map may already be removed
      }
    };
  }, [map, cityId, blueprint]);

  return null;
}
