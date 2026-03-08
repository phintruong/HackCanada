'use client';

import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { getFirstSymbolLayerId } from '@/lib/mapbox/createMap';

interface TrafficLayerProps {
  map: mapboxgl.Map | null;
}

const SOURCE_ID = 'mapbox-traffic';
const LAYER_PREFIX = 'traffic-flow';

const ROAD_CLASSES = [
  { id: 'motorway', filter: ['==', 'class', 'motorway'], width: 4, minzoom: 6 },
  { id: 'trunk', filter: ['==', 'class', 'trunk'], width: 3.5, minzoom: 8 },
  { id: 'primary', filter: ['==', 'class', 'primary'], width: 3, minzoom: 9 },
  { id: 'secondary', filter: ['==', 'class', 'secondary'], width: 2.5, minzoom: 10 },
  { id: 'tertiary', filter: ['==', 'class', 'tertiary'], width: 2, minzoom: 11 },
  { id: 'street', filter: ['==', 'class', 'street'], width: 1.5, minzoom: 13 },
];

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
      if (!map!.getSource(SOURCE_ID)) {
        map!.addSource(SOURCE_ID, {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1',
        });
      }

      // Insert below base map symbols so hospital circles (and other layers) draw on top
      const beforeId = getFirstSymbolLayerId(map!);

      for (const road of ROAD_CLASSES) {
        const layerId = `${LAYER_PREFIX}-${road.id}`;
        if (map!.getLayer(layerId)) continue;

        const layer: mapboxgl.LineLayer = {
          id: layerId,
          type: 'line',
          source: SOURCE_ID,
          'source-layer': 'traffic',
          filter: road.filter as mapboxgl.FilterSpecification,
          minzoom: road.minzoom,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': CONGESTION_COLORS,
            'line-width': road.width,
            'line-opacity': 0.75,
          },
        };
        map!.addLayer(layer, beforeId);
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
        for (const road of ROAD_CLASSES) {
          const layerId = `${LAYER_PREFIX}-${road.id}`;
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Map may already be destroyed
      }
    };
  }, [map]);

  return null;
}
