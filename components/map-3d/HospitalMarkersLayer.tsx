'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { MapHospitalMarker } from '@/lib/map-3d/types';

function getMarkerColor(occupancyPct?: number): string {
  if (occupancyPct == null) return '#3b82f6';
  if (occupancyPct <= 50) return '#22c55e';
  if (occupancyPct <= 75) return '#eab308';
  if (occupancyPct <= 90) return '#f97316';
  return '#dc2626';
}

interface HospitalMarkersLayerProps {
  map: mapboxgl.Map | null;
  hospitals: MapHospitalMarker[];
  onMarkerClick: (marker: MapHospitalMarker) => void;
}

export default function HospitalMarkersLayer({ map, hospitals, onMarkerClick }: HospitalMarkersLayerProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    hospitals.forEach((hospital) => {
      const color = getMarkerColor(hospital.occupancyPct);
      const el = document.createElement('div');
      el.className = 'hospital-marker-pin';
      el.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%;
        background: ${color}; border: 2px solid #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        cursor: pointer;
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([hospital.lng, hospital.lat])
        .addTo(map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onMarkerClick(hospital);
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [map, hospitals, onMarkerClick]);

  return null;
}
