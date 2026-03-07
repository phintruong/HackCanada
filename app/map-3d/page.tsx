'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { Map as MapboxMap } from 'mapbox-gl';
import Mapbox3DMap from '@/components/map-3d/Mapbox3DMap';
import CitySelector from '@/components/map-3d/CitySelector';
import HospitalMarkersLayer from '@/components/map-3d/HospitalMarkersLayer';
import HospitalPopup from '@/components/map-3d/HospitalPopup';
import { CITIES } from '@/lib/map-3d/cities';
import { getMockHospitalsByCity } from '@/lib/map-3d/mockHospitals';
import type { CityConfig } from '@/lib/map-3d/types';
import type { MapHospitalMarker } from '@/lib/map-3d/types';

export default function Map3DPage() {
  const [selectedCity, setSelectedCity] = useState<CityConfig>(CITIES[0]);
  const [selectedMarker, setSelectedMarker] = useState<MapHospitalMarker | null>(null);
  const [map, setMap] = useState<MapboxMap | null>(null);

  const hospitals = getMockHospitalsByCity(selectedCity.id);

  const handleCityChange = useCallback((city: CityConfig) => {
    setSelectedCity(city);
    setSelectedMarker(null);
  }, []);

  const handleMarkerClick = useCallback((marker: MapHospitalMarker) => {
    setSelectedMarker(marker);
  }, []);

  const handlePopupClose = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  return (
    <div className="map-3d-page relative h-screen w-full overflow-hidden bg-[#f4efe6]">
      <nav className="map-3d-nav absolute left-1/2 top-6 z-10 -translate-x-1/2">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="lp-nav-logo text-[#1a1611] no-underline"
          >
            KingsView
          </Link>
          <CitySelector
            cities={CITIES}
            currentCity={selectedCity}
            onCityChange={handleCityChange}
          />
        </div>
      </nav>

      <div className="absolute inset-0 pt-20">
        <Mapbox3DMap
          cityConfig={selectedCity}
          onMapReady={setMap}
        />
        {map && (
          <>
            <HospitalMarkersLayer
              map={map}
              hospitals={hospitals}
              onMarkerClick={handleMarkerClick}
            />
            <HospitalPopup
              map={map}
              selectedMarker={selectedMarker}
              onClose={handlePopupClose}
            />
          </>
        )}
      </div>
    </div>
  );
}
