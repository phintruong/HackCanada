'use client';
import { useState, useCallback } from 'react';
import ClearPathMap from '@/components/clearpath/ClearPathMap';
import ModeToggle from '@/components/clearpath/ModeToggle';
import CitySelector from '@/components/clearpath/CitySelector';
import GovernmentSidebar from '@/components/clearpath/government/GovernmentSidebar';
import CivilianPanel from '@/components/clearpath/civilian/CivilianPanel';
import { CITIES } from '@/lib/map-3d/cities';

export default function MapPage() {
  const [mode, setMode] = useState<'government' | 'civilian'>('civilian');
  const [selectedCity, setSelectedCity] = useState(() => CITIES[0]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [recommendedHospital, setRecommendedHospital] = useState(null);
  const [proposedLocation, setProposedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    if (mode === 'government') {
      setProposedLocation({ lat: lngLat.lat, lng: lngLat.lng });
      window.dispatchEvent(new CustomEvent('clearpath:mapclick', { detail: lngLat }));
    }
  }, [mode]);

  const handleCityChange = useCallback((city: (typeof CITIES)[0]) => {
    setSelectedCity(city);
  }, []);

  return (
    <div className='relative w-full h-screen'>
      <ClearPathMap
        mode={mode}
        cityId={selectedCity.id}
        cityConfig={selectedCity}
        simulationResult={simulationResult}
        recommendedHospital={recommendedHospital}
        onMapClick={handleMapClick}
        proposedLocation={proposedLocation}
      />
      <div className='absolute top-0 left-0 w-96 z-10 flex flex-col gap-3 p-4'>
        <ModeToggle mode={mode} onChange={setMode} />
        <CitySelector
          cities={CITIES}
          currentCityId={selectedCity.id}
          onCityChange={handleCityChange}
        />
        <div className='flex-1 min-h-0'>
          {mode === 'government' ? (
            <GovernmentSidebar onSimulationResult={setSimulationResult} />
          ) : (
            <CivilianPanel onRecommendation={setRecommendedHospital} />
          )}
        </div>
      </div>
    </div>
  );
}
