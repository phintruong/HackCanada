'use client';

import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

interface FlowArcsProps {
  map: mapboxgl.Map | null;
  hospitals: any[];
  proposedLocations: Array<{ lat: number; lng: number }>;
  simulationResult: any;
}

export default function FlowArcs({ map, hospitals, proposedLocations, simulationResult }: FlowArcsProps) {
  useEffect(() => {
    if (!map || !simulationResult || hospitals.length === 0 || proposedLocations.length === 0) return;

    const sourceId = 'flow-arcs';
    const layerId = 'flow-arc-lines';

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    const hospitalsWithNegativeDelta = hospitals.filter((h: any) => {
      const id = (h._id ?? h.id)?.toString();
      return simulationResult.delta && simulationResult.delta[id] < 0;
    });

    for (const h of hospitalsWithNegativeDelta) {
      const hId = (h._id ?? h.id)?.toString();
      const delta = simulationResult.delta?.[hId] ?? 0;
      for (const p of proposedLocations) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [h.longitude, h.latitude],
              [p.lng, p.lat],
            ],
          },
          properties: { delta, name: h.name },
        });
      }
    }

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features
      });
      return;
    }

    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features }
    });

    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.8
      }
    });

    return () => {
      try {
        if (map.getStyle()) {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      } catch {
        // Map already destroyed during navigation — nothing to clean up
      }
    };
  }, [map, hospitals, proposedLocations, simulationResult]);

  return null;
}
