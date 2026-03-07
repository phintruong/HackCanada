'use client';

import { useState, useCallback } from 'react';
import VitalsCapture from './VitalsCapture';
import SymptomCards from './SymptomCards';
import RoutingResult from './RoutingResult';
import { VitalsPayload, SymptomsPayload } from '@/lib/clearpath/types';

interface CivilianPanelProps {
  onRecommendation: (result: any) => void;
}

type Step = 'address' | 'vitals' | 'symptoms' | 'loading' | 'result';

export default function CivilianPanel({ onRecommendation }: CivilianPanelProps) {
  const [step, setStep] = useState<Step>('address');
  const [postalCode, setPostalCode] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [vitals, setVitals] = useState<VitalsPayload | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomsPayload | null>(null);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUseMyLocation = useCallback(() => {
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPostalCode('');
        setLocating(false);
      },
      () => {
        setError('Could not get your location. Please enter a postal code.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const handleVitalsComplete = useCallback((v: VitalsPayload) => {
    setVitals(v);
    setStep('symptoms');
  }, []);

  const handleVitalsSkip = useCallback(() => {
    setVitals({ heartRate: 75, respiratoryRate: 16, stressIndex: 0.3 });
    setStep('symptoms');
  }, []);

  const handleSymptomsComplete = useCallback(
    async (sym: SymptomsPayload) => {
      setSymptoms(sym);
      setStep('loading');
      setError(null);

      const effectiveVitals = vitals ?? { heartRate: 75, respiratoryRate: 16, stressIndex: 0.3 };

      try {
        // Step 1: AI Triage
        const triageRes = await fetch('/api/clearpath/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vitals: effectiveVitals,
            symptoms: sym,
            city: 'toronto',
          }),
        });

        if (!triageRes.ok) {
          setError('Triage analysis failed. Please try again.');
          setStep('symptoms');
          return;
        }

        const triage = await triageRes.json();
        setTriageResult(triage);

        // Step 2: Smart routing with real location + symptoms
        const routeBody: any = {
          severity: triage.severity,
          city: 'toronto',
          symptoms: sym,
        };

        if (userCoords) {
          routeBody.userLat = userCoords.lat;
          routeBody.userLng = userCoords.lng;
        } else if (postalCode.trim()) {
          routeBody.postalCode = postalCode.trim();
        } else {
          // Fallback to downtown Toronto
          routeBody.userLat = 43.6532;
          routeBody.userLng = -79.3832;
        }

        const routeRes = await fetch('/api/clearpath/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeBody),
        });

        if (!routeRes.ok) {
          setError('No hospitals found nearby. Please try again.');
          setStep('symptoms');
          return;
        }

        const route = await routeRes.json();
        setRouteResult(route);
        onRecommendation(route);
        setStep('result');
      } catch (err) {
        setError('Failed to complete triage. Please try again.');
        setStep('symptoms');
        console.error(err);
      }
    },
    [vitals, userCoords, postalCode, onRecommendation]
  );

  const resetFlow = () => {
    setStep('address');
    setVitals(null);
    setSymptoms(null);
    setTriageResult(null);
    setRouteResult(null);
    setUserCoords(null);
    setError(null);
    onRecommendation(null);
  };

  const canStart = postalCode.trim().length > 0 || userCoords !== null;

  return (
    <div className="h-full bg-white/90 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.65)] border border-white/20 rounded-3xl p-5 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-black text-red-700 uppercase tracking-tight">
          ClearPath ER
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Find the right ER for your situation.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50/95 border border-red-200/80 rounded-2xl text-xs text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {step === 'address' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl shadow-sm">
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-2">
              Your Postal Code
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => { setPostalCode(e.target.value); setUserCoords(null); }}
              placeholder="e.g. M5B 1W8"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400 uppercase">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            onClick={handleUseMyLocation}
            disabled={locating}
            className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold transition-colors border border-blue-200 flex items-center justify-center gap-2"
          >
            {locating ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                Locating...
              </>
            ) : userCoords ? (
              <>
                <span className="text-green-600">&#10003;</span> Location detected
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Use My Location
              </>
            )}
          </button>

          <button
            onClick={() => setStep('vitals')}
            disabled={!canStart}
            className={`w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors ${
              canStart
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Start Triage
          </button>
        </div>
      )}

      {step === 'vitals' && (
        <VitalsCapture onComplete={handleVitalsComplete} onSkip={handleVitalsSkip} />
      )}

      {step === 'symptoms' && (
        <SymptomCards onComplete={handleSymptomsComplete} />
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-700">Analyzing your symptoms...</p>
          <p className="text-xs text-slate-400 mt-1">Computing optimal route with live traffic</p>
        </div>
      )}

      {step === 'result' && triageResult && routeResult && (
        <RoutingResult
          severity={triageResult.severity}
          reasoning={triageResult.reasoning}
          recommended={routeResult.recommended}
          alternatives={routeResult.alternatives}
          onBack={resetFlow}
        />
      )}

      <div className="mt-8 pt-4 border-t border-slate-100">
        <div className="flex gap-1.5">
          {(['address', 'vitals', 'symptoms', 'result'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                (['address', 'vitals', 'symptoms', 'loading', 'result'] as Step[]).indexOf(step) >= i
                  ? 'bg-red-500'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <p className="text-[9px] text-slate-400 text-center mt-2 uppercase tracking-wider">
          {step === 'address' && 'Step 1 of 4 — Location'}
          {step === 'vitals' && 'Step 2 of 4 — Vitals'}
          {step === 'symptoms' && 'Step 3 of 4 — Symptoms'}
          {step === 'loading' && 'Processing...'}
          {step === 'result' && 'Step 4 of 4 — Result'}
        </p>
      </div>
    </div>
  );
}
