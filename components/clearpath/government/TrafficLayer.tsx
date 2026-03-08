'use client';

import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { getFirstSymbolLayerId } from '@/lib/mapbox/createMap';

interface TrafficLayerProps {
  map: mapboxgl.Map | null;
}

const SOURCE_ID = 'mapbox-traffic';
const CASING_LAYER_ID = 'traffic-flow-casing-all';
const FLOW_LAYER_ID = 'traffic-flow-all';

const CONGESTION_COLORS: mapboxgl.Expression = [
  'match', ['get', 'congestion'],
  'low', '#22c55e',
  'moderate', '#eab308',
  'heavy', '#f97316',
  'severe', '#dc2626',
  '#64748b',
];

export default function TrafficLayer({ map }: TrafficLayerProps) {
  useEffect(() => {
    if (!map) return;

    function addTrafficLayers() {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1',
        });
      }

      // Insert below base map symbols so hospital circles (and other layers) draw on top
      const beforeId = getFirstSymbolLayerId(map);

      if (!map.getLayer(CASING_LAYER_ID)) {
        map.addLayer(
          {
            id: CASING_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            'source-layer': 'traffic',
            minzoom: 5,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#0f172a',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                6, 3,
                10, 5,
                14, 8,
              ],
              'line-opacity': 0.5,
            },
          },
          beforeId
        );
      }

      if (!map.getLayer(FLOW_LAYER_ID)) {
        map.addLayer(
          {
            id: FLOW_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            'source-layer': 'traffic',
            minzoom: 5,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': CONGESTION_COLORS,
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                6, 1.8,
                10, 2.8,
                14, 4.2,
              ],
              'line-opacity': 0.98,
            },
          },
          beforeId
        );
      }
    }

    if (map.isStyleLoaded()) {
      addTrafficLayers();
    } else {
      map.once('style.load', addTrafficLayers);
    }

    return () => {
      if (!map) return;
      try {
        if (map.getLayer(FLOW_LAYER_ID)) map.removeLayer(FLOW_LAYER_ID);
        if (map.getLayer(CASING_LAYER_ID)) map.removeLayer(CASING_LAYER_ID);
        // Don't remove the source — other base-style layers may depend on it
      } catch {
        // Map may already be destroyed
      }
    };
  }, [map]);

  return null;
}
