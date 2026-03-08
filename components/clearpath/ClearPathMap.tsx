'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createMapboxMap } from '@/lib/mapbox/createMap';
import CongestionLayer from './CongestionLayer';
import FlowArcs from './FlowArcs';
import HospitalFootprintsLayer from './HospitalFootprintsLayer';
import LandmarksLayer from './LandmarksLayer';
import TrafficLayer from './government/TrafficLayer';
import GLBModelLayer from './government/GLBModelLayer';
import SuitableParcelsLayer from './government/SuitableParcelsLayer';
import CoverageHeatmapLayer from './government/CoverageHeatmapLayer';
import type { HospitalStatsPanelData } from './CongestionLayer';
import type { CityConfig } from '@/lib/map-3d/types';
import type { TimelinePrediction } from '@/lib/clearpath/trafficPrediction';
import type { Blueprint, ProposedBuilding } from '@/lib/clearpath/blueprints';
import type { SimulateResult } from '@/lib/clearpath/types';
import type { ScoredHospital } from '@/lib/clearpath/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface RouteRecommendation {
  recommended: ScoredHospital;
  alternatives: ScoredHospital[];
  userLocation: { lat: number; lng: number };
  activeRoute?: ScoredHospital;
}

interface ClearPathMapProps {
  mode: 'government' | 'civilian';
  cityId: string;
  cityConfig: CityConfig;
  simulationResult: SimulateResult | null;
  recommendedHospital: RouteRecommendation | null;
  onMapClick?: (lngLat: { lng: number; lat: number }, blueprint: Blueprint | null) => void;
  onProposedLocationUpdate?: (id: string, lngLat: { lng: number; lat: number }) => void;
  proposedLocations?: ProposedBuilding[];
  trafficPrediction?: TimelinePrediction | null;
  trafficDragging?: boolean;
  selectedBlueprint?: Blueprint | null;
  mapStyle?: string;
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

function getOccupancyLabel(pct: number): string {
  if (pct < 40) return 'Low';
  if (pct < 60) return 'Moderate';
  if (pct < 80) return 'High';
  return 'Critical';
}

function getOccupancyColor(pct: number): string {
  if (pct < 40) return '#22c55e';
  if (pct < 60) return '#eab308';
  if (pct < 80) return '#f97316';
  return '#dc2626';
}

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
  onProposedLocationUpdate,
  proposedLocations = [],
  trafficPrediction,
  trafficDragging,
  selectedBlueprint,
  mapStyle = 'mapbox://styles/mapbox/navigation-night-v1',
}: ClearPathMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<HospitalStatsPanelData | null>(null);
  const [hospitals, setHospitals] = useState<Array<{ _id?: { toString: () => string }; id?: string; name?: string; latitude?: number; longitude?: number; erBeds?: number }>>([]);
  const [congestion, setCongestion] = useState<Array<{ hospitalId: string; occupancyPct: number; waitMinutes: number }>>([]);
  const proposedMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const recommendedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const prevCityIdRef = useRef(cityId);
  const trafficAnimRef = useRef<number>(0);
  const onMapClickRef = useRef(onMapClick);
  const selectedBlueprintRef = useRef(selectedBlueprint);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
    selectedBlueprintRef.current = selectedBlueprint;
  }, [onMapClick, selectedBlueprint]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = createMapboxMap({
      container: mapContainer.current,
      center: [-79.3832, 43.6532],
      zoom: 11.5,
      pitch: 45,
      bearing: -17.6,
      addGlobalBuildings: false,
      style: mapStyle,
    });

    map.on('load', () => {
      map.flyTo({
        center: [-79.3832, 43.6532],
        zoom: 13,
        pitch: 65,
        bearing: -20,
        duration: 2000,
      });
      setMapInstance(map);
      setMapReady(true);
    });

    map.on('click', (e) => {
      const bp = selectedBlueprintRef.current;
      if (bp && map.getLayer('suitable-parcels-fill')) {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['suitable-parcels-fill'] });
        if (!hits.length) return;
      }
      onMapClickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat }, bp ?? null);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
      setMapReady(false);
    };
  }, [mapStyle]);

  // Switch styles when mapStyle changes (skip initial render — constructor already set the style)
  const prevStyleRef = useRef(mapStyle);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStyle === prevStyleRef.current) return;
    prevStyleRef.current = mapStyle;
    map.setStyle(mapStyle);
    setMapReady(false);
    map.once('style.load', () => {
      setMapReady(true);
      setMapInstance(map);
    });
  }, [mapStyle]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [hospRes, congRes] = await Promise.all([
          fetch(`/api/clearpath/hospitals?city=${cityId}`),
          fetch(`/api/clearpath/congestion?city=${cityId}`),
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
  }, [cityId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (prevCityIdRef.current === cityId) return;
    prevCityIdRef.current = cityId;
    setSelectedHospital(null);
    map.flyTo({
      center: cityConfig.center,
      zoom: cityConfig.zoom ?? 11.5,
      pitch: cityConfig.pitch ?? 65,
      bearing: cityConfig.bearing ?? -20,
      duration: 2000,
    });
  }, [cityId, cityConfig, mapReady]);

  const onProposedLocationUpdateRef = useRef(onProposedLocationUpdate);
  useEffect(() => {
    onProposedLocationUpdateRef.current = onProposedLocationUpdate;
  }, [onProposedLocationUpdate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'government') {
      proposedMarkersRef.current.forEach((m) => m.remove());
      proposedMarkersRef.current.clear();
      return;
    }

    const currentIds = new Set(proposedLocations.map((b) => b.id));
    const markers = proposedMarkersRef.current;

    for (const [id, marker] of markers) {
      if (!currentIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }

    for (const b of proposedLocations) {
      const existing = markers.get(b.id);
      if (existing) {
        existing.setLngLat([b.lng, b.lat]);
        continue;
      }

      const el = document.createElement('div');
      el.className = 'proposed-hospital-pin';
      el.style.cssText = `
        width: 24px; height: 24px; border-radius: 50%;
        background: #3b82f6; border: 3px solid #fff;
        box-shadow: 0 0 12px rgba(59,130,246,0.6);
        cursor: grab;
      `;
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([b.lng, b.lat])
        .addTo(map);

      const buildingId = b.id;
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        if (selectedBlueprintRef.current && mapRef.current) {
          const pt = mapRef.current.project(lngLat);
          const hits = mapRef.current.queryRenderedFeatures(pt, { layers: ['suitable-parcels-fill'] });
          if (!hits.length) {
            const prev = proposedLocations.find((x) => x.id === buildingId);
            if (prev) marker.setLngLat([prev.lng, prev.lat]);
            return;
          }
        }
        onProposedLocationUpdateRef.current?.(buildingId, { lng: lngLat.lng, lat: lngLat.lat });
      });

      markers.set(b.id, marker);
    }
  }, [mode, proposedLocations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    // Clean up previous markers and route
    recommendedMarkerRef.current?.remove();
    recommendedMarkerRef.current = null;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    cancelAnimationFrame(trafficAnimRef.current);

    // Remove animated dash layer
    if (map.getLayer('driving-route-anim-line')) map.removeLayer('driving-route-anim-line');
    if (map.getSource('driving-route-anim')) map.removeSource('driving-route-anim');

    // Remove traffic segment layers (don't break on gaps — continue to clean all)
    for (let i = 0; i < 200; i++) {
      const lid = `traffic-seg-line-${i}`;
      const sid = `traffic-seg-${i}`;
      if (map.getLayer(lid)) map.removeLayer(lid);
      if (map.getSource(sid)) map.removeSource(sid);
    }

    if (map.getLayer('driving-route-line')) map.removeLayer('driving-route-line');
    if (map.getSource('driving-route')) map.removeSource('driving-route');

    // Remove ALL alt routes (dynamic count, not just 0 and 1)
    for (let i = 0; i < 10; i++) {
      if (map.getLayer(`alt-route-line-${i}`)) map.removeLayer(`alt-route-line-${i}`);
      if (map.getSource(`alt-route-${i}`)) map.removeSource(`alt-route-${i}`);
    }

    if (!recommendedHospital) return;
    const recHosp = recommendedHospital;

    const rec = recHosp.recommended ?? recHosp;
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

    // Use activeRoute if set (from "Show Route" on an alternative), otherwise use recommended
    const activeRoute = recHosp.activeRoute;
    const routeSource = activeRoute ?? rec;
    const routeGeometry = routeSource.routeGeometry;
    const congestionSegs = routeSource.congestionSegments as string[] | undefined;

    function drawRoute() {
      if (cancelled || !map) return;

      if (routeGeometry && mode !== 'government') {
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
          const currentMap = mapRef.current;
          if (!currentMap || cancelled) return;
          dashOffset -= avgSpeed * 0.15;
          const phase = ((dashOffset % 7) + 7) % 7;
          try {
            if (!currentMap.getLayer('driving-route-anim-line')) return;
            currentMap.setPaintProperty('driving-route-anim-line', 'line-dasharray', [phase, 4, 3]);
          } catch {
            return;
          }
          trafficAnimRef.current = requestAnimationFrame(animateDash);
        }
        trafficAnimRef.current = requestAnimationFrame(animateDash);
      }

      // Draw alternative routes as dashed lines (civilian only)
      const alts = mode === 'government' ? [] : (recHosp.alternatives ?? []);
      alts.forEach((alt: ScoredHospital, i: number) => {
        if (alt.routeGeometry) {
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
    }

    // Wait for map style to be loaded before drawing layers
    if (map.isStyleLoaded()) {
      drawRoute();
    } else {
      map.once('styledata', drawRoute);
    }

    return () => {
      cancelled = true;
    };
  }, [recommendedHospital, mode]);

  // Update route progress + traffic colors when the timeline slider moves
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !trafficPrediction || !recommendedHospital) return;

    const predSegs = trafficPrediction.segments;
    const rec = recommendedHospital.recommended;
    const activeRoute = recommendedHospital.activeRoute;
    const routeSource: ScoredHospital = activeRoute ?? rec;
    const routeGeometry = routeSource.routeGeometry;

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
          <HospitalFootprintsLayer map={mapInstance} />
          <LandmarksLayer map={mapInstance} />
          <CongestionLayer map={mapInstance} hospitals={hospitals} congestion={congestion} onHospitalSelect={setSelectedHospital} />
          {mode === 'government' && (
            <>
              <TrafficLayer map={mapInstance} />
              <CoverageHeatmapLayer map={mapInstance} hospitals={hospitals} congestion={congestion} />
              {selectedBlueprint && (
                <SuitableParcelsLayer
                  map={mapInstance}
                  cityId={cityId}
                  blueprint={selectedBlueprint}
                />
              )}
              <FlowArcs
                map={mapInstance}
                hospitals={hospitals}
                proposedLocations={proposedLocations.map((b) => ({ lat: b.lat, lng: b.lng }))}
                simulationResult={simulationResult}
              />
              {proposedLocations.map((b) => (
                <GLBModelLayer
                  key={b.id}
                  id={b.id}
                  map={mapInstance}
                  glbPath={b.blueprint.glbPath}
                  lngLat={{ lat: b.lat, lng: b.lng }}
                  rotation={b.rotation}
                />
              ))}
            </>
          )}
        </>
      )}
      {selectedHospital && (
        <div className="absolute top-4 right-4 z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-sky-100 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <button
            type="button"
            onClick={() => setSelectedHospital(null)}
            className="absolute right-2 top-2 h-7 w-7 rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close hospital details"
          >
            ×
          </button>
          <p className="pr-8 text-2xl font-extrabold text-slate-900">{selectedHospital.name}</p>
          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-500">Occupancy</span>
              <span style={{ color: getOccupancyColor(selectedHospital.occupancyPct) }} className="font-bold">
                {selectedHospital.occupancyPct}% - {getOccupancyLabel(selectedHospital.occupancyPct)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${selectedHospital.occupancyPct}%`,
                  backgroundColor: getOccupancyColor(selectedHospital.occupancyPct),
                }}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3 text-center">
              <p className="text-4xl font-black text-slate-900">{selectedHospital.erBeds}</p>
              <p className="text-xs uppercase tracking-widest text-slate-500">ER Beds</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3 text-center">
              <p className="text-4xl font-black text-slate-900">{selectedHospital.totalBeds}</p>
              <p className="text-xs uppercase tracking-widest text-slate-500">Total Beds</p>
            </div>
          </div>
          {selectedHospital.specialties.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm uppercase tracking-widest text-slate-500">Specialties</p>
              <div className="flex flex-wrap gap-2">
                {selectedHospital.specialties.map((specialty) => (
                  <span key={specialty} className="rounded-full border border-sky-100 bg-sky-50/60 px-3 py-1 text-sm font-semibold text-slate-700">
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}
          {selectedHospital.phone && (
            <a href={`tel:${selectedHospital.phone}`} className="mt-5 inline-flex items-center gap-2 text-3xl font-medium text-sky-500 hover:text-sky-600">
              <span aria-hidden>📞</span>
              {selectedHospital.phone}
            </a>
          )}
        </div>
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
