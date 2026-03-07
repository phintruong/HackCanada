'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createMapboxMap } from '@/lib/map-3d/createMap';
import type { CityConfig } from '@/lib/map-3d/types';

interface Mapbox3DMapProps {
  cityConfig: CityConfig;
  onMapReady?: (map: mapboxgl.Map) => void;
}

export default function Mapbox3DMap({ cityConfig, onMapReady }: Mapbox3DMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = createMapboxMap({
      container: mapContainer.current,
      center: cityConfig.center,
      zoom: cityConfig.zoom,
      pitch: cityConfig.pitch,
      bearing: cityConfig.bearing,
    });

    map.on('load', () => {
      setMapReady(true);
      onMapReady?.(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    map.flyTo({
      center: cityConfig.center,
      zoom: cityConfig.zoom,
      pitch: cityConfig.pitch ?? 45,
      bearing: cityConfig.bearing ?? 0,
      duration: 2000,
    });
  }, [cityConfig.id, cityConfig.center, cityConfig.zoom, cityConfig.pitch, cityConfig.bearing, mapReady]);

  return (
    <div className="absolute inset-0">
      {!mapReady && (
        <div className="map-3d-loading absolute inset-0 z-20 flex items-center justify-center bg-[#f4efe6]">
          <p className="map-3d-loading-text font-medium text-[#3d362c]">Loading map…</p>
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
