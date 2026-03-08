'use client';

import { useState, useEffect, useCallback } from 'react';
import SimulationResultPanel from './SimulationResultPanel';
import BlueprintPicker from './BlueprintPicker';
import type { Blueprint, ProposedBuilding } from '@/lib/clearpath/blueprints';

interface GovernmentSidebarProps {
  cityId: string;
  proposedLocations: ProposedBuilding[];
  onProposedLocationsChange: (locations: ProposedBuilding[]) => void;
  onSimulationResult: (result: any) => void;
  onBlueprintChange?: (blueprint: Blueprint | null) => void;
}

export default function GovernmentSidebar({
  cityId,
  proposedLocations,
  onProposedLocationsChange,
  onSimulationResult,
  onBlueprintChange,
}: GovernmentSidebarProps) {
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [simResult, setSimResult] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/clearpath/hospitals?city=${cityId}`)
      .then(r => r.json())
      .then(setHospitals)
      .catch(console.error);
  }, [cityId]);

  useEffect(() => {
    function handleMapClick() {
      setSimResult(null);
    }
    window.addEventListener('clearpath:mapclick' as any, handleMapClick);
    return () => window.removeEventListener('clearpath:mapclick' as any, handleMapClick);
  }, []);

  const runSimulation = useCallback(async () => {
    if (proposedLocations.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/clearpath/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: cityId,
          proposals: proposedLocations.map((b) => ({
            lat: b.lat,
            lng: b.lng,
            capacity: b.blueprint.beds,
          })),
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
  }, [proposedLocations, cityId, onSimulationResult]);

  const removeBuilding = useCallback(
    (id: string) => {
      onProposedLocationsChange(proposedLocations.filter((b) => b.id !== id));
      setSimResult(null);
    },
    [proposedLocations, onProposedLocationsChange]
  );

  const clearAll = useCallback(() => {
    onProposedLocationsChange([]);
    setSimResult(null);
  }, [onProposedLocationsChange]);

  const handleBlueprintSelect = useCallback((bp: Blueprint) => {
    const next = selectedBlueprint?.id === bp.id ? null : bp;
    setSelectedBlueprint(next);
    onBlueprintChange?.(next);
  }, [selectedBlueprint, onBlueprintChange]);

  return (
    <div className="h-full bg-white/95 backdrop-blur-xl shadow-xl border border-sky-100 rounded-3xl p-5 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-black text-sky-700 uppercase tracking-tight">
          Planning Console
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Simulate new ER placement and assess impact on the regional hospital network.
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-sky-50/60 border border-sky-200/70 rounded-2xl space-y-3">
          <h3 className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-black text-white">1</span>
            Select Blueprint
          </h3>
          <p className="text-[11px] text-slate-400">
            Choose a building blueprint to place on the map.
          </p>
          <BlueprintPicker selected={selectedBlueprint} onSelect={handleBlueprintSelect} />
        </div>

        <div className="p-4 bg-sky-50/60 border border-sky-200/70 rounded-2xl space-y-3">
          <h3 className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-black text-white">2</span>
            {selectedBlueprint ? 'Place Buildings on Map' : 'Select a blueprint first'}
          </h3>
          <p className="text-[11px] text-slate-400">
            {selectedBlueprint
              ? 'Click highlighted zones to add buildings. You can place multiple.'
              : 'Choose a blueprint above, then click on highlighted parcels.'}
          </p>
          {proposedLocations.length > 0 && (
            <div className="space-y-1.5">
              {proposedLocations.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-white/80 border border-sky-100"
                >
                  <span className="text-[11px] font-medium text-slate-700 truncate">
                    {b.blueprint.name} ({b.blueprint.beds} beds)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBuilding(b.id)}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 w-full py-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-sky-50/60 border border-sky-200/70 rounded-2xl">
          <h3 className="text-[11px] font-bold text-sky-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-black text-white">3</span>
            Run Simulation
          </h3>
          <button
            onClick={runSimulation}
            disabled={proposedLocations.length === 0 || loading}
            className={`w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${proposedLocations.length > 0 && !loading
                ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
          >
            {loading ? 'Running Simulation...' : 'Run Voronoi Simulation'}
          </button>
          {proposedLocations.length === 0 && (
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Place at least one building on the map first
            </p>
          )}
        </div>

        {simResult && (
          <SimulationResultPanel
            result={simResult}
            hospitals={hospitals}
            proposedLabels={Object.fromEntries(
              proposedLocations.map((b, i) => [`proposed-${i}`, `${b.blueprint.name} (new)`])
            )}
          />
        )}
      </div>
    </div>
  );
}
