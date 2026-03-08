'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import SimulationResultPanel from './SimulationResultPanel';
import BlueprintPicker from './BlueprintPicker';
import type { Blueprint, ProposedBuilding } from '@/lib/clearpath/blueprints';

interface GovernmentSidebarProps {
  cityId: string;
  proposedLocations: ProposedBuilding[];
  onProposedLocationsChange: (locations: ProposedBuilding[]) => void;
  onSimulationResult: (result: any) => void;
  onBlueprintChange?: (blueprint: Blueprint | null) => void;
  customBlueprints?: Blueprint[];
  importedBlueprint?: Blueprint | null;
}

export default function GovernmentSidebar({
  cityId,
  proposedLocations,
  onProposedLocationsChange,
  onSimulationResult,
  onBlueprintChange,
  customBlueprints = [],
  importedBlueprint,
}: GovernmentSidebarProps) {
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(importedBlueprint ?? null);
  const [simResult, setSimResult] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-select imported blueprint when it arrives
  useEffect(() => {
    if (importedBlueprint && selectedBlueprint?.id !== importedBlueprint.id) {
      setSelectedBlueprint(importedBlueprint);
      onBlueprintChange?.(importedBlueprint);
    }
  }, [importedBlueprint]);

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

  const updateBuilding = useCallback(
    (id: string, updates: Partial<{ lat: number; lng: number; rotation: number }>) => {
      onProposedLocationsChange(
        proposedLocations.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
      setSimResult(null);
    },
    [proposedLocations, onProposedLocationsChange]
  );

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
    <div className="civ-panel gov-panel">
      <div className="civ-header">
        <div className="civ-header-icon" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 20h18" />
            <path d="M5 20V9l7-5 7 5v11" />
            <path d="M9 12h6" />
            <path d="M12 9v6" />
          </svg>
        </div>
        <div>
          <h2 className="civ-header-title">Planning Console</h2>
          <p className="civ-header-sub">Simulate ER placement and assess network impact</p>
        </div>
      </div>

      <div className="space-y-4">
        <Link
          href="/editor"
          className="civ-btn civ-btn--location w-full justify-center border-2 border-dashed"
        >
          <span aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22h20" />
              <path d="M7 22V10l5-4 5 4v12" />
              <path d="M10 14h4" />
            </svg>
          </span>
          Build in 3D Editor
        </Link>

        <div className="civ-glass rounded-2xl p-4 border border-sky-100/70 space-y-3">
          <h3 className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-black text-white">1</span>
            Select Blueprint
          </h3>
          <p className="text-[11px] text-slate-500">
            Choose a building blueprint to place on the map.
          </p>
          <BlueprintPicker selected={selectedBlueprint} onSelect={handleBlueprintSelect} customBlueprints={customBlueprints} />
        </div>

        <div className="civ-glass rounded-2xl p-4 border border-sky-100/70 space-y-3">
          <h3 className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-black text-white">2</span>
            {selectedBlueprint ? 'Place Buildings on Map' : 'Select a blueprint first'}
          </h3>
          <p className="text-[11px] text-slate-500">
            {selectedBlueprint
              ? 'Click highlighted zones to add buildings. You can place multiple.'
              : 'Choose a blueprint above, then click on highlighted parcels.'}
          </p>
          {proposedLocations.length > 0 && (
            <div className="space-y-2">
              {proposedLocations.map((b) => {
                const degrees = Math.round((b.rotation ?? 0) * (180 / Math.PI));
                return (
                  <div key={b.id} className="rounded-lg bg-white/90 border border-sky-100 overflow-hidden p-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-700 truncate">
                        {b.blueprint.name} ({b.blueprint.beds} beds)
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBuilding(b.id)}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50 shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                    {/* Rotation */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Rotation: {degrees}°
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={5}
                        value={degrees}
                        onChange={(e) =>
                          updateBuilding(b.id, { rotation: Number(e.target.value) * (Math.PI / 180) })
                        }
                        className="w-full h-1.5 mt-1 accent-sky-500"
                      />
                    </div>
                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Lat
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={b.lat.toFixed(6)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) updateBuilding(b.id, { lat: val });
                          }}
                          className="w-full mt-0.5 px-1.5 py-1 text-[11px] rounded border border-slate-200 focus:border-sky-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Lng
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={b.lng.toFixed(6)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) updateBuilding(b.id, { lng: val });
                          }}
                          className="w-full mt-0.5 px-1.5 py-1 text-[11px] rounded border border-slate-200 focus:border-sky-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={clearAll}
                className="civ-btn civ-btn--ghost w-full justify-center py-2! text-xs!"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="civ-glass rounded-2xl p-4 border border-sky-100/70">
          <h3 className="text-[11px] font-bold text-sky-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-black text-white">3</span>
            Run Simulation
          </h3>
          <button
            onClick={runSimulation}
            disabled={proposedLocations.length === 0 || loading}
            className={`civ-btn w-full justify-center ${proposedLocations.length > 0 && !loading
              ? 'civ-btn--primary'
              : 'civ-btn--ghost civ-btn--disabled'
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
