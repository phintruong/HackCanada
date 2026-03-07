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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface ClearPathMapProps {
  mode: 'government' | 'civilian';
  cityId: string;
  cityConfig: CityConfig;
  simulationResult: any;
  recommendedHospital: any;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  proposedLocation?: { lat: number; lng: number } | null;
}

export default function ClearPathMap({
  mode,
  cityId,
  cityConfig,
  simulationResult,
  recommendedHospital,
  onMapClick,
  proposedLocation,
}: ClearPathMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [congestion, setCongestion] = useState<any[]>([]);
  const proposedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const recommendedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

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

    // Recommended hospital marker
    const el = document.createElement('div');
    el.style.cssText = `
      width: 32px; height: 32px; border-radius: 50%;
      background: #22c55e; border: 3px solid #fff;
      box-shadow: 0 0 16px rgba(34,197,94,0.7);
      animation: bounce 1s infinite;
    `;
    recommendedMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([h.longitude, h.latitude])
      .addTo(map);

    // Draw driving route (if geometry available)
    const routeGeometry = rec.routeGeometry;
    if (routeGeometry && map.isStyleLoaded()) {
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
          'line-color': '#22c55e',
          'line-width': 5,
          'line-opacity': 0.85,
        },
      });
    }

    // Draw alternative routes as dashed lines
    const alts = recommendedHospital.alternatives ?? [];
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
            'line-opacity': 0.5,
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
  }, [recommendedHospital]);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="w-full h-full" />
      {mapReady && (
        <>
          <HospitalFootprintsLayer map={mapRef.current} cityId={cityId} />
          <LandmarksLayer map={mapRef.current} cityId={cityId} />
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
