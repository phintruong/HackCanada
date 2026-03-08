'use client';
import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import ClearPathMap from '@/components/clearpath/ClearPathMap';
import ModeToggle from '@/components/clearpath/ModeToggle';
import CitySelector from '@/components/clearpath/CitySelector';
import GovernmentSidebar from '@/components/clearpath/government/GovernmentSidebar';
import CivilianPanel from '@/components/clearpath/civilian/CivilianPanel';
import TrafficTimeline from '@/components/clearpath/TrafficTimeline';
import { CITIES } from '@/lib/map-3d/cities';
import type { TimelinePrediction, RerouteAlert } from '@/lib/clearpath/trafficPrediction';
import type { Blueprint, ProposedBuilding } from '@/lib/clearpath/blueprints';

export default function MapPage() {
  const [mode, setMode] = useState<'government' | 'civilian'>('civilian');
  const [selectedCity, setSelectedCity] = useState(() => CITIES[0]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [recommendedHospital, setRecommendedHospital] = useState<any>(null);
  const [proposedLocations, setProposedLocations] = useState<ProposedBuilding[]>([]);
  const [trafficPrediction, setTrafficPrediction] = useState<TimelinePrediction | null>(null);
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  const originalRouteRef = useRef<any>(null);
  const lastRouteParamsRef = useRef<any>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }, blueprint: Blueprint | null) => {
    if (mode === 'government' && blueprint) {
      const id = `proposed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setProposedLocations((prev) => [...prev, { id, lat: lngLat.lat, lng: lngLat.lng, blueprint }]);
      window.dispatchEvent(new CustomEvent('clearpath:mapclick', { detail: { lngLat, blueprint } }));
    }
  }, [mode]);

  const handleProposedLocationUpdate = useCallback((id: string, lngLat: { lng: number; lat: number }) => {
    setProposedLocations((prev) =>
      prev.map((b) => (b.id === id ? { ...b, lng: lngLat.lng, lat: lngLat.lat } : b))
    );
  }, []);

  const handleCityChange = useCallback((city: (typeof CITIES)[0]) => {
    setSelectedCity(city);
  }, []);

  const handleModeChange = useCallback((newMode: 'government' | 'civilian') => {
    setMode(newMode);
    if (newMode === 'government') {
      setRecommendedHospital(null);
      setTrafficPrediction(null);
    } else {
      setProposedLocations([]);
      setSimulationResult(null);
      setSelectedBlueprint(null);
    }
  }, []);

  const handleRecommendation = useCallback((result: any, routeParams?: any) => {
    setRecommendedHospital(result);
    if (routeParams) lastRouteParamsRef.current = routeParams;
    if (result && !originalRouteRef.current) {
      originalRouteRef.current = result;
    }
    if (!result) {
      originalRouteRef.current = null;
      lastRouteParamsRef.current = null;
      setTrafficPrediction(null);
    }
  }, []);

  const handleTimeChange = useCallback((prediction: TimelinePrediction, dragging: boolean) => {
    setTrafficPrediction(prediction);
    setIsTimelineDragging(dragging);
  }, []);

  const handleRerouteRequest = useCallback(async (alert: RerouteAlert) => {
    const orig = recommendedHospital ?? originalRouteRef.current;
    if (!orig?.alternatives?.length) return;

    // Find the suggested alternative by name, fall back to first alternative
    const suggestedName = alert.suggestedHospital;
    const matchIdx = suggestedName
      ? orig.alternatives.findIndex(
        (a: any) => (a.hospital?.name ?? a.name) === suggestedName
      )
      : 0;
    const altIdx = matchIdx >= 0 ? matchIdx : 0;
    const bestAlt = orig.alternatives[altIdx];

    const swapped = {
      ...orig,
      recommended: bestAlt,
      alternatives: [
        orig.recommended,
        ...orig.alternatives.filter((_: any, i: number) => i !== altIdx),
      ],
      activeRoute: undefined, // clear any "Show Route" override
    };
    originalRouteRef.current = swapped;
    setRecommendedHospital(swapped);
  }, [recommendedHospital]);

  const rec = recommendedHospital?.recommended;
  const activeRec = recommendedHospital?.activeRoute ?? rec;
  const showTimeline = mode === 'civilian' && (activeRec?.routeGeometry || rec?.routeGeometry);

  return (
    <div className='fixed inset-0 overflow-hidden'>
      <ClearPathMap
        mode={mode}
        cityId={selectedCity.id}
        cityConfig={selectedCity}
        simulationResult={simulationResult}
        recommendedHospital={recommendedHospital}
        onMapClick={handleMapClick}
        onProposedLocationUpdate={handleProposedLocationUpdate}
        proposedLocations={proposedLocations}
        trafficPrediction={trafficPrediction}
        trafficDragging={isTimelineDragging}
        selectedBlueprint={selectedBlueprint}
      />
      <div className='absolute top-0 left-0 w-md z-10 flex flex-col gap-3 p-4 max-h-screen overflow-y-auto'>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-800 text-left rounded-full px-3 py-2 -ml-1 hover:bg-white/80 transition-colors"
          aria-label="Back to home"
        >
          <span aria-hidden>←</span>
          Back
        </Link>
        <ModeToggle mode={mode} onChange={handleModeChange} />
        <CitySelector
          cities={CITIES}
          currentCityId={selectedCity.id}
          onCityChange={handleCityChange}
        />
        <div className='flex-1 min-h-0'>
          {mode === 'government' ? (
            <GovernmentSidebar
              cityId={selectedCity.id}
              proposedLocations={proposedLocations}
              onProposedLocationsChange={setProposedLocations}
              onSimulationResult={setSimulationResult}
              onBlueprintChange={setSelectedBlueprint}
            />
          ) : (
            <CivilianPanel
              onRecommendation={handleRecommendation}
              currentRecommendation={recommendedHospital}
            />
          )}
        </div>
      </div>

      {showTimeline && (
        <TrafficTimeline
          congestionSegments={activeRec.congestionSegments}
          segmentCount={activeRec.routeGeometry?.coordinates?.length ?? 0}
          onTimeChange={handleTimeChange}
          onRerouteRequest={handleRerouteRequest}
          recommended={activeRec}
          alternatives={recommendedHospital?.alternatives ?? []}
          isRerouting={isRerouting}
        />
      )}
    </div>
  );
}
