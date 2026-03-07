'use client';

import { useState, useEffect, useCallback } from 'react';
import CapacitySlider from './CapacitySlider';
import ProposedHospitalPin from './ProposedHospitalPin';
import SimulationResultPanel from './SimulationResultPanel';

interface GovernmentSidebarProps {
  onSimulationResult: (result: any) => void;
}

export default function GovernmentSidebar({ onSimulationResult }: GovernmentSidebarProps) {
  const [proposedLocation, setProposedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [capacity, setCapacity] = useState(100);
  const [simResult, setSimResult] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [city] = useState('toronto');

  useEffect(() => {
    fetch(`/api/clearpath/hospitals?city=${city}`)
      .then(r => r.json())
      .then(setHospitals)
      .catch(console.error);
  }, [city]);

  useEffect(() => {
    function handleMapClick(e: CustomEvent) {
      setProposedLocation({ lat: e.detail.lat, lng: e.detail.lng });
      setSimResult(null);
    }
    window.addEventListener('clearpath:mapclick' as any, handleMapClick);
    return () => window.removeEventListener('clearpath:mapclick' as any, handleMapClick);
  }, []);

  const runSimulation = useCallback(async () => {
    if (!proposedLocation) return;
    setLoading(true);
    try {
      const res = await fetch('/api/clearpath/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          proposedLat: proposedLocation.lat,
          proposedLng: proposedLocation.lng,
          proposedCapacity: capacity,
        }),
      });
      const result = await res.json();
      setSimResult(result);
      onSimulationResult(result);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setLoading(false);
    }
  }, [proposedLocation, capacity, city, onSimulationResult]);

  return (
    <div className="h-full bg-white/95 backdrop-blur-xl shadow-xl border border-sky-100 rounded-3xl p-5 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-black text-sky-800 uppercase tracking-tight">
          Government Mode
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Plan new ER placement and simulate impact on the hospital network.
        </p>
      </div>

      <div className="space-y-5">
        <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-3 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Place Proposed ER
          </h3>
          <p className="text-[11px] text-slate-500">
            Click anywhere on the map to drop a proposed ER location.
          </p>
          {proposedLocation && (
            <ProposedHospitalPin lat={proposedLocation.lat} lng={proposedLocation.lng} />
          )}
        </div>

        <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            2. Set Capacity
          </h3>
          <CapacitySlider value={capacity} onChange={setCapacity} />
        </div>

        <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            3. Run Simulation
          </h3>
          <button
            onClick={runSimulation}
            disabled={!proposedLocation || loading}
            className={`w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
              proposedLocation && !loading
                ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Simulating...' : 'Run Voronoi Simulation'}
          </button>
          {!proposedLocation && (
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Place a pin on the map first
            </p>
          )}
        </div>

        {simResult && (
          <SimulationResultPanel result={simResult} hospitals={hospitals} />
        )}
      </div>
    </div>
  );
}
