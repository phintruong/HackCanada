'use client';

import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { getFirstSymbolLayerId } from '@/lib/mapbox/createMap';

const SOURCE_ID = 'landmarks';
const LAYER_ID = 'landmarks-extrusion';

interface LandmarksLayerProps {
  map: mapboxgl.Map | null;
  cityId: string;
}

export default function LandmarksLayer({ map, cityId }: LandmarksLayerProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const beforeLayerId = getFirstSymbolLayerId(map);
    if (!beforeLayerId) return;

    async function addLayer() {
      try {
        const res = await fetch(`/map-data/landmarks-${cityId}.geojson`);
        if (!res.ok) {
          setLoaded(true);
          return;
        }
        const data = await res.json();

        if (map.getSource(SOURCE_ID)) {
          (map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(data);
          setLoaded(true);
          return;
        }

        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data,
        });

        map.addLayer(
          {
            id: LAYER_ID,
            type: 'fill-extrusion',
            source: SOURCE_ID,
            paint: {
              'fill-extrusion-color': '#8b7355',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.8,
            },
          },
          beforeLayerId
        );
      } catch {
        // File may not exist yet
      }
      setLoaded(true);
    }

    addLayer();

    return () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, cityId]);

  return null;
}
