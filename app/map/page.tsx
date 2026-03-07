'use client';
import { useState, useCallback, useRef } from 'react';
import ClearPathMap from '@/components/clearpath/ClearPathMap';
import ModeToggle from '@/components/clearpath/ModeToggle';
import CitySelector from '@/components/clearpath/CitySelector';
import GovernmentSidebar from '@/components/clearpath/government/GovernmentSidebar';
import CivilianPanel from '@/components/clearpath/civilian/CivilianPanel';
import TrafficTimeline from '@/components/clearpath/TrafficTimeline';
import { CITIES } from '@/lib/map-3d/cities';
import type { ClearPathScenario } from '@/lib/clearpath/types';
import type { TimelinePrediction } from '@/lib/clearpath/trafficPrediction';

export default function MapPage() {
  const [mode, setMode] = useState<'government' | 'civilian'>('civilian');
  const [selectedCity, setSelectedCity] = useState(() => CITIES[0]);
  const [scenario, setScenario] = useState<ClearPathScenario>('normal');
  const [simulationResult, setSimulationResult] = useState(null);
  const [recommendedHospital, setRecommendedHospital] = useState<any>(null);
  const [proposedLocation, setProposedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [trafficPrediction, setTrafficPrediction] = useState<TimelinePrediction | null>(null);
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);

  const originalRouteRef = useRef<any>(null);

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    if (mode === 'government') {
      setProposedLocation({ lat: lngLat.lat, lng: lngLat.lng });
      window.dispatchEvent(new CustomEvent('clearpath:mapclick', { detail: lngLat }));
    }
  }, [mode]);

  const handleCityChange = useCallback((city: (typeof CITIES)[0]) => {
    setSelectedCity(city);
  }, []);

  const handleRecommendation = useCallback((result: any) => {
    setRecommendedHospital(result);
    if (result && !originalRouteRef.current) {
      originalRouteRef.current = result;
    }
    if (!result) {
      originalRouteRef.current = null;
      setTrafficPrediction(null);
    }
  }, []);

  const handleTimeChange = useCallback((prediction: TimelinePrediction, dragging: boolean) => {
    setTrafficPrediction(prediction);
    setIsTimelineDragging(dragging);
  }, []);

  const handleRerouteRequest = useCallback(() => {
    const orig = originalRouteRef.current;
    if (!orig?.alternatives?.length) return;
    const bestAlt = orig.alternatives[0];
    setRecommendedHospital({
      ...orig,
      recommended: bestAlt,
      alternatives: [orig.recommended, ...orig.alternatives.slice(1)],
    });
  }, []);

  const rec = recommendedHospital?.recommended;
  const showTimeline = mode === 'civilian' && rec?.routeGeometry;

  return (
    <div className='fixed inset-0 overflow-hidden'>
      <ClearPathMap
        mode={mode}
        cityId={selectedCity.id}
        cityConfig={selectedCity}
        scenario={scenario}
        simulationResult={simulationResult}
        recommendedHospital={recommendedHospital}
        onMapClick={handleMapClick}
        proposedLocation={proposedLocation}
        trafficPrediction={trafficPrediction}
        trafficDragging={isTimelineDragging}
      />
      <div className='absolute top-0 left-0 w-md z-10 flex flex-col gap-3 p-4 max-h-screen overflow-y-auto'>
        <ModeToggle mode={mode} onChange={setMode} />
        <CitySelector
          cities={CITIES}
          currentCityId={selectedCity.id}
          onCityChange={handleCityChange}
        />
        <div className='flex-1 min-h-0'>
          {mode === 'government' ? (
            <GovernmentSidebar
              city={selectedCity.id}
              scenario={scenario}
              onScenarioChange={setScenario}
              onSimulationResult={setSimulationResult}
            />
          ) : (
            <CivilianPanel onRecommendation={handleRecommendation} />
          )}
        </div>
      </div>

      {showTimeline && (
        <TrafficTimeline
          congestionSegments={rec.congestionSegments}
          segmentCount={rec.routeGeometry?.coordinates?.length ?? 0}
          onTimeChange={handleTimeChange}
          onRerouteRequest={handleRerouteRequest}
        />
      )}
    </div>
  );
}
