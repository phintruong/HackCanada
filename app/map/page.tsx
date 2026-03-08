'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ClearPathMap from '@/components/clearpath/ClearPathMap';
import ModeToggle from '@/components/clearpath/ModeToggle';
import DayNightToggle from '@/components/clearpath/DayNightToggle';
import CitySelector from '@/components/clearpath/CitySelector';
import GovernmentSidebar from '@/components/clearpath/government/GovernmentSidebar';
import CivilianPanel from '@/components/clearpath/civilian/CivilianPanel';
import TrafficTimeline from '@/components/clearpath/TrafficTimeline';
import { CITIES } from '@/lib/map-3d/cities';
import { createBlueprintFromBuilding, type Blueprint } from '@/lib/clearpath/blueprints';
import type { TimelinePrediction, RerouteAlert } from '@/lib/clearpath/trafficPrediction';
import type { ProposedBuilding } from '@/lib/clearpath/blueprints';

export default function MapPage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'government' ? 'government' : searchParams.get('mode') === 'civilian' ? 'civilian' : 'civilian';
  const [mode, setMode] = useState<'government' | 'civilian'>(initialMode);
  const [selectedCity, setSelectedCity] = useState<typeof CITIES[0] | null>(null);
  const mapCity = selectedCity ?? CITIES[0];
  const [simulationResult, setSimulationResult] = useState(null);
  const [recommendedHospital, setRecommendedHospital] = useState<any>(null);
  const [proposedLocations, setProposedLocations] = useState<ProposedBuilding[]>([]);
  const [trafficPrediction, setTrafficPrediction] = useState<TimelinePrediction | null>(null);
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [customBlueprints, setCustomBlueprints] = useState<Blueprint[]>([]);
  const [importedBlueprint, setImportedBlueprint] = useState<Blueprint | null>(null);
  const [isDark, setIsDark] = useState(false);
  const mapStyle = isDark
    ? 'mapbox://styles/mapbox/navigation-night-v1'
    : 'mapbox://styles/mapbox/satellite-streets-v12';

  // Handle buildingId query param from editor export
  useEffect(() => {
    const buildingId = searchParams.get('buildingId');
    if (!buildingId) return;

    (async () => {
      try {
        const res = await fetch('/api/editor/building');
        if (!res.ok) return;
        const { buildings } = await res.json();
        const match = buildings.find((b: any) => b.id === buildingId);
        if (!match) return;

        const bp = createBlueprintFromBuilding(match);
        setCustomBlueprints((prev) => {
          if (prev.some((p) => p.id === bp.id)) return prev;
          return [bp, ...prev];
        });
        setImportedBlueprint(bp);
        setSelectedBlueprint(bp);
        setMode('government');
      } catch (err) {
        console.error('Failed to load exported building:', err);
      }
    })();
  }, [searchParams]);

  const originalRouteRef = useRef<any>(null);
  const lastRouteParamsRef = useRef<any>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }, blueprint: Blueprint | null) => {
    if (mode === 'government' && blueprint) {
      const id = `proposed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setProposedLocations((prev) => [...prev, { id, lat: lngLat.lat, lng: lngLat.lng, rotation: 0, blueprint }]);
      window.dispatchEvent(new CustomEvent('clearpath:mapclick', { detail: { lngLat, blueprint } }));
    }
  }, [mode]);

  const handleProposedLocationUpdate = useCallback((id: string, lngLat: { lng: number; lat: number }) => {
    setProposedLocations((prev) =>
      prev.map((b) => (b.id === id ? { ...b, lng: lngLat.lng, lat: lngLat.lat } : b))
    );
  }, []);

  const handleCityChange = useCallback((city: (typeof CITIES)[0] | null) => {
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
        cityId={mapCity.id}
        cityConfig={mapCity}
        simulationResult={simulationResult}
        recommendedHospital={recommendedHospital}
        onMapClick={handleMapClick}
        onProposedLocationUpdate={handleProposedLocationUpdate}
        proposedLocations={proposedLocations}
        trafficPrediction={trafficPrediction}
        trafficDragging={isTimelineDragging}
        selectedBlueprint={selectedBlueprint}
        mapStyle={mapStyle}
      />
      <div className='cp-map-rail'>
        <Link
          href="/"
          className="cp-back-btn"
          aria-label="Back to home"
        >
          <span className="cp-back-btn__icon" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </span>
          <span>Back to Home</span>
        </Link>
        {!searchParams.get('mode') && (
          <ModeToggle mode={mode} onChange={handleModeChange} />
        )}
        <div className="cp-map-controls-row">
          <CitySelector
            cities={CITIES}
            currentCityId={selectedCity?.id ?? ''}
            onCityChange={handleCityChange}
          />
          <DayNightToggle isDark={isDark} onToggle={() => setIsDark((d) => !d)} />
        </div>
        <div className='cp-map-panel-wrap'>
          {mode === 'government' ? (
            <GovernmentSidebar
              cityId={mapCity.id}
              proposedLocations={proposedLocations}
              onProposedLocationsChange={setProposedLocations}
              onSimulationResult={setSimulationResult}
              onBlueprintChange={setSelectedBlueprint}
              customBlueprints={customBlueprints}
              importedBlueprint={importedBlueprint}
            />
          ) : selectedCity ? (
            <CivilianPanel
              cityId={selectedCity.id}
              onRecommendation={handleRecommendation}
              currentRecommendation={recommendedHospital}
            />
          ) : (
            <div className="civ-panel civ-panel--pick-location">
              <div className="civ-header">
                <div className="civ-header-icon" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <h2 className="civ-header-title">ERoute</h2>
                  <p className="civ-header-sub">Find the right ER for your situation</p>
                </div>
              </div>
              <p className="civ-pick-location-message">
                Please select a location above (Toronto, Waterloo, or Mississauga) to get started.
              </p>
            </div>
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
