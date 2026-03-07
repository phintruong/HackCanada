'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createMapboxMap } from '@/lib/mapbox/createMap';
import CongestionLayer from './CongestionLayer';
import FlowArcs from './FlowArcs';
import HospitalFootprintsLayer from './HospitalFootprintsLayer';
import LandmarksLayer from './LandmarksLayer';
import type { CityConfig } from '@/lib/map-3d/types';
import type { TimelinePrediction } from '@/lib/clearpath/trafficPrediction';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface ClearPathMapProps {
  mode: 'government' | 'civilian';
  cityId: string;
  cityConfig: CityConfig;
  simulationResult: any;
  recommendedHospital: any;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  proposedLocation?: { lat: number; lng: number } | null;
  trafficPrediction?: TimelinePrediction | null;
  trafficDragging?: boolean;
}

const CONGESTION_COLORS: Record<string, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  heavy: '#f97316',
  severe: '#dc2626',
  unknown: '#22c55e',
};

const CONGESTION_SPEED: Record<string, number> = {
  low: 1.8,
  moderate: 1.0,
  heavy: 0.5,
  severe: 0.2,
  unknown: 1.8,
};

function buildTrafficSegments(
  coordinates: [number, number][],
  congestionSegments?: string[]
): Array<{ geometry: GeoJSON.LineString; congestion: string }> {
  const segments: Array<{ geometry: GeoJSON.LineString; congestion: string }> = [];
  for (let i = 0; i < coordinates.length - 1; i++) {
    const level = congestionSegments?.[i] ?? 'unknown';
    segments.push({
      geometry: { type: 'LineString', coordinates: [coordinates[i], coordinates[i + 1]] },
      congestion: level,
    });
  }

  // Merge consecutive segments with the same congestion level
  const merged: typeof segments = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.congestion === seg.congestion) {
      last.geometry.coordinates.push(seg.geometry.coordinates[1]);
    } else {
      merged.push({
        geometry: { type: 'LineString', coordinates: [...seg.geometry.coordinates] },
        congestion: seg.congestion,
      });
    }
  }
  return merged;
}

export default function ClearPathMap({
  mode,
  cityId,
  cityConfig,
  simulationResult,
  recommendedHospital,
  onMapClick,
  proposedLocation,
  trafficPrediction,
  trafficDragging,
}: ClearPathMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [congestion, setCongestion] = useState<any[]>([]);
  const proposedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const recommendedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const prevCityIdRef = useRef(cityId);
  const trafficAnimRef = useRef<number>(0);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = createMapboxMap({
      container: mapContainer.current,
      center: [-79.3832, 43.6532],
      zoom: 11.5,
      pitch: 45,
      bearing: -17.6,
      addGlobalBuildings: false,
    });

    map.on('load', () => {
      map.flyTo({
        center: [-79.3832, 43.6532],
        zoom: 13,
        pitch: 65,
        bearing: -20,
        duration: 2000,
      });
      setMapReady(true);
    });

    map.on('click', (e) => {
      onMapClick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [hospRes, congRes] = await Promise.all([
          fetch('/api/clearpath/hospitals'),
          fetch('/api/clearpath/congestion'),
        ]);
        const hospData = await hospRes.json();
        const congData = await congRes.json();
        setHospitals(hospData);
        setCongestion(congData);
      } catch (err) {
        console.warn('Failed to fetch hospital data, using empty state', err);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (prevCityIdRef.current === cityId) return;
    prevCityIdRef.current = cityId;
    map.flyTo({
      center: cityConfig.center,
      zoom: cityConfig.zoom ?? 11.5,
      pitch: cityConfig.pitch ?? 65,
      bearing: cityConfig.bearing ?? -20,
      duration: 2000,
    });
  }, [cityId, cityConfig, mapReady]);

  useEffect(() => {
    if (!mapRef.current || !proposedLocation) {
      proposedMarkerRef.current?.remove();
      proposedMarkerRef.current = null;
      return;
    }

    if (proposedMarkerRef.current) {
      proposedMarkerRef.current.setLngLat([proposedLocation.lng, proposedLocation.lat]);
    } else {
      const el = document.createElement('div');
      el.className = 'proposed-hospital-pin';
      el.style.cssText = `
        width: 24px; height: 24px; border-radius: 50%;
        background: #3b82f6; border: 3px solid #fff;
        box-shadow: 0 0 12px rgba(59,130,246,0.6);
        cursor: grab;
      `;
      proposedMarkerRef.current = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([proposedLocation.lng, proposedLocation.lat])
        .addTo(mapRef.current);

      proposedMarkerRef.current.on('dragend', () => {
        const lngLat = proposedMarkerRef.current!.getLngLat();
        onMapClick?.({ lng: lngLat.lng, lat: lngLat.lat });
      });
    }
  }, [proposedLocation, onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up previous markers and route
    recommendedMarkerRef.current?.remove();
    recommendedMarkerRef.current = null;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    cancelAnimationFrame(trafficAnimRef.current);

    // Remove animated dash layer
    if (map.getLayer('driving-route-anim-line')) map.removeLayer('driving-route-anim-line');
    if (map.getSource('driving-route-anim')) map.removeSource('driving-route-anim');

    // Remove traffic segment layers
    for (let i = 0; i < 200; i++) {
      const lid = `traffic-seg-line-${i}`;
      const sid = `traffic-seg-${i}`;
      if (!map.getLayer(lid)) break;
      map.removeLayer(lid);
      map.removeSource(sid);
    }

    if (map.getLayer('driving-route-line')) map.removeLayer('driving-route-line');
    if (map.getSource('driving-route')) map.removeSource('driving-route');
    if (map.getLayer('alt-route-line-0')) map.removeLayer('alt-route-line-0');
    if (map.getSource('alt-route-0')) map.removeSource('alt-route-0');
    if (map.getLayer('alt-route-line-1')) map.removeLayer('alt-route-line-1');
    if (map.getSource('alt-route-1')) map.removeSource('alt-route-1');

    if (!recommendedHospital) return;

    const rec = recommendedHospital.recommended ?? recommendedHospital;
    const h = rec.hospital ?? rec;
    if (!h?.latitude || !h?.longitude) return;

    // User location marker (pulsing blue dot)
    const userLoc = recommendedHospital.userLocation;
    if (userLoc) {
      const userEl = document.createElement('div');
      userEl.style.cssText = `
        width: 16px; height: 16px; border-radius: 50%;
        background: #3b82f6; border: 3px solid #fff;
        box-shadow: 0 0 0 0 rgba(59,130,246,0.5);
        animation: pulse-ring 2s infinite;
      `;
      userMarkerRef.current = new mapboxgl.Marker({ element: userEl })
        .setLngLat([userLoc.lng, userLoc.lat])
        .addTo(map);
    }

    // Draw traffic-colored route with animated dashes (civilian only; hide in government mode)
    const routeGeometry = rec.routeGeometry;
    const congestionSegs = rec.congestionSegments as string[] | undefined;

    if (routeGeometry && map.isStyleLoaded() && mode !== 'government') {
      // Background: subtle dark line for depth
      map.addSource('driving-route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: routeGeometry, properties: {} },
      });
      map.addLayer({
        id: 'driving-route-line',
        type: 'line',
        source: 'driving-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0f172a',
          'line-width': 8,
          'line-opacity': 0.35,
        },
      });

      // Traffic-colored segments on top
      const trafficSegs = buildTrafficSegments(routeGeometry.coordinates, congestionSegs);
      trafficSegs.forEach((seg, i) => {
        const srcId = `traffic-seg-${i}`;
        const layerId = `traffic-seg-line-${i}`;
        map.addSource(srcId, {
          type: 'geojson',
          data: { type: 'Feature', geometry: seg.geometry, properties: {} },
        });
        map.addLayer({
          id: layerId,
          type: 'line',
          source: srcId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': CONGESTION_COLORS[seg.congestion] ?? CONGESTION_COLORS.unknown,
            'line-width': 5,
            'line-opacity': 0.9,
          },
        });
      });

      // Animated dash overlay that "flows" along the route
      map.addSource('driving-route-anim', {
        type: 'geojson',
        data: { type: 'Feature', geometry: routeGeometry, properties: {} },
      });
      map.addLayer({
        id: 'driving-route-anim-line',
        type: 'line',
        source: 'driving-route-anim',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-opacity': 0.6,
          'line-dasharray': [0, 4, 3],
        },
      });

      // Animate the dash offset
      let dashOffset = 0;
      const avgSpeed = congestionSegs?.length
        ? congestionSegs.reduce((sum, c) => sum + (CONGESTION_SPEED[c] ?? 1.8), 0) / congestionSegs.length
        : 1.8;

      function animateDash() {
        if (!map) return;
        dashOffset -= avgSpeed * 0.15;
        const phase = ((dashOffset % 7) + 7) % 7;
        map.setPaintProperty('driving-route-anim-line', 'line-dasharray', [phase, 4, 3]);
        trafficAnimRef.current = requestAnimationFrame(animateDash);
      }
      trafficAnimRef.current = requestAnimationFrame(animateDash);
    }

    // Draw alternative routes as dashed lines (civilian only)
    const alts = mode === 'government' ? [] : (recommendedHospital.alternatives ?? []);
    alts.forEach((alt: any, i: number) => {
      if (alt.routeGeometry && map.isStyleLoaded()) {
        map.addSource(`alt-route-${i}`, {
          type: 'geojson',
          data: { type: 'Feature', geometry: alt.routeGeometry, properties: {} },
        });
        map.addLayer({
          id: `alt-route-line-${i}`,
          type: 'line',
          source: `alt-route-${i}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#94a3b8',
            'line-width': 3,
            'line-opacity': 0.4,
            'line-dasharray': [2, 2],
          },
        });
      }
    });

    // Fit bounds to show user + hospital
    if (userLoc && routeGeometry?.coordinates) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([userLoc.lng, userLoc.lat]);
      bounds.extend([h.longitude, h.latitude]);
      routeGeometry.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
    } else {
      map.flyTo({ center: [h.longitude, h.latitude], zoom: 13, speed: 1.2 });
    }
  }, [recommendedHospital, mode]);

  // Update route progress + traffic colors when the timeline slider moves
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !trafficPrediction) return;

    const predSegs = trafficPrediction.segments;
    const rec = recommendedHospital?.recommended ?? recommendedHospital;
    const routeGeometry = rec?.routeGeometry;
    const baseCongestion = rec?.congestionSegments as string[] | undefined;

    if (!routeGeometry?.coordinates) return;

    const allCoords: [number, number][] = routeGeometry.coordinates;
    const totalPts = allCoords.length;

    // When the slider is being dragged, progressively reveal the route
    // based on the future time. When it's inactive, always show the full route.
    let fraction = 1;
    if (trafficDragging) {
      const maxMinutes = 60;
      fraction = Math.min(1, Math.max(0.05, trafficPrediction.minutesFromNow / maxMinutes));
    }
    const visibleCount = Math.max(2, Math.round(totalPts * fraction));
    const trimmedCoords = allCoords.slice(0, visibleCount);
    const trimmedGeometry = { type: 'LineString' as const, coordinates: trimmedCoords };

    // Update the background line
    const bgSrc = map.getSource('driving-route') as mapboxgl.GeoJSONSource | undefined;
    if (bgSrc) {
      bgSrc.setData({ type: 'Feature', geometry: trimmedGeometry, properties: {} });
    }

    // Update the animated dash overlay
    const animSrc = map.getSource('driving-route-anim') as mapboxgl.GeoJSONSource | undefined;
    if (animSrc) {
      animSrc.setData({ type: 'Feature', geometry: trimmedGeometry, properties: {} });
    }

    // Build predicted congestion array for the visible portion of the route.
    // Each predSeg maps 1:1 to a coordinate pair [i, i+1].
    const predictedCongestion: string[] = [];
    for (let i = 0; i < visibleCount - 1; i++) {
      const seg = predSegs[Math.min(i, predSegs.length - 1)];
      predictedCongestion.push(seg?.congestion ?? 'unknown');
    }

    const mergedSegs = buildTrafficSegments(trimmedCoords, predictedCongestion);

    // Update existing traffic segment layers: show visible ones, hide the rest
    for (let i = 0; i < 200; i++) {
      const layerId = `traffic-seg-line-${i}`;
      const srcId = `traffic-seg-${i}`;
      if (!map.getLayer(layerId)) break;

      if (i < mergedSegs.length) {
        const src = map.getSource(srcId) as mapboxgl.GeoJSONSource | undefined;
        if (src) {
          src.setData({ type: 'Feature', geometry: mergedSegs[i].geometry, properties: {} });
        }

        const color = CONGESTION_COLORS[mergedSegs[i].congestion] ?? CONGESTION_COLORS.unknown;
        map.setPaintProperty(layerId, 'line-color', color);
        map.setPaintProperty(layerId, 'line-opacity', 0.9);
      } else {
        map.setPaintProperty(layerId, 'line-opacity', 0);
      }
    }
  }, [trafficPrediction, trafficDragging, recommendedHospital]);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="w-full h-full" />
      {mapReady && (
        <>
          <HospitalFootprintsLayer map={mapRef.current} />
          <LandmarksLayer map={mapRef.current} />
          <CongestionLayer map={mapRef.current} hospitals={hospitals} congestion={congestion} />
          <FlowArcs
            map={mapRef.current}
            hospitals={hospitals}
            proposedLocation={proposedLocation ?? null}
            simulationResult={simulationResult}
          />
        </>
      )}
      <style jsx global>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
