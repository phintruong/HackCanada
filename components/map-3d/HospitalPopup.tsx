'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { MapHospitalMarker } from '@/lib/map-3d/types';

interface HospitalPopupProps {
  map: mapboxgl.Map | null;
  selectedMarker: MapHospitalMarker | null;
  onClose: () => void;
}

export default function HospitalPopup({ map, selectedMarker, onClose }: HospitalPopupProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map) return;

    popupRef.current?.remove();
    popupRef.current = null;

    if (!selectedMarker) return;

    const html = `
      <div class="map-3d-popup">
        <h3 class="map-3d-popup-title">${selectedMarker.name}</h3>
        ${selectedMarker.occupancyPct != null ? `<p class="map-3d-popup-meta">Occupancy: ${Math.round(selectedMarker.occupancyPct)}%</p>` : ''}
        ${selectedMarker.waitMinutes != null ? `<p class="map-3d-popup-meta">~${selectedMarker.waitMinutes} min wait</p>` : ''}
      </div>
    `;

    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
    })
      .setLngLat([selectedMarker.lng, selectedMarker.lat])
      .setHTML(html)
      .addTo(map);

    popup.on('close', onClose);
    popupRef.current = popup;

    return () => {
      popup.remove();
      popupRef.current = null;
    };
  }, [map, selectedMarker, onClose]);

  return null;
}
