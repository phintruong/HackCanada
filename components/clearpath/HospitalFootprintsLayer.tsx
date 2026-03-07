'use client';

import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { getFirstSymbolLayerId } from '@/lib/mapbox/createMap';

const SOURCE_ID = 'hospital-footprints';
const LAYER_ID = 'hospital-footprints-extrusion';

interface HospitalFootprintsLayerProps {
  map: mapboxgl.Map | null;
  cityId: string;
}

export default function HospitalFootprintsLayer({ map, cityId }: HospitalFootprintsLayerProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const beforeLayerId = getFirstSymbolLayerId(map);
    if (!beforeLayerId) return;

    async function addLayer() {
      try {
        const res = await fetch(`/map-data/hospital-footprints-${cityId}.geojson`);
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
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6,
            },
          },
          beforeLayerId
        );
      } catch {
        // File may not exist yet (script not run)
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
