'use client';

import { useState, useCallback, useEffect } from 'react';
import VitalsCapture from './VitalsCapture';
import SymptomCards from './SymptomCards';
import RoutingResult from './RoutingResult';
import type { VitalsPayload, SymptomsPayload, TriageResponse, RouteResponse, ScoredHospital } from '@/lib/clearpath/types';

const API_TIMEOUT_MS = 10_000;

interface CivilianPanelProps {
  onRecommendation: (result: RouteResponse | null, routeParams?: Record<string, unknown>) => void;
  currentRecommendation?: RouteResponse & { activeRoute?: ScoredHospital } | null;
}

type Step = 'address' | 'vitals' | 'symptoms' | 'loading' | 'result';

export default function CivilianPanel({ onRecommendation, currentRecommendation }: CivilianPanelProps) {
  const [step, setStep] = useState<Step>('address');
  const [postalCode, setPostalCode] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [vitals, setVitals] = useState<VitalsPayload | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomsPayload | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResponse | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync state when page.tsx updates recommendation (e.g. from a reroute)
  useEffect(() => {
    if (currentRecommendation && currentRecommendation !== routeResult) {
      setRouteResult(currentRecommendation);
      // If an activeRoute is set (from Show Route), use its hospital ID
      const activeRoute = currentRecommendation.activeRoute;
      if (activeRoute) {
        const h = activeRoute.hospital as { id?: string; _id?: string } | undefined;
        setActiveRouteId(h?.id ?? h?._id ?? null);
      } else {
        const rec = currentRecommendation.recommended as ScoredHospital | undefined;
        const h = rec?.hospital as { id?: string; _id?: string } | undefined;
        setActiveRouteId(h?.id ?? h?._id ?? null);
      }
    }
  }, [currentRecommendation, routeResult]);

  const handleUseMyLocation = useCallback(() => {
    setLocating(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Location is not supported on this device. Please enter a postal code.');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);

        // Reverse geocode to show postal code in the input
        (async () => {
          try {
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            if (!token) {
              return;
            }

            const url =
              `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
              `${coords.lng},${coords.lat}.json` +
              `?country=ca&types=postcode&limit=1&access_token=${token}`;

            const res = await fetch(url);
            if (!res.ok) return;

            const data = (await res.json()) as { features?: Array<{ text?: string; properties?: { postalcode?: string }; place_name?: string }> };
            const feature = data.features?.[0];
            const code =
              feature?.text ||
              feature?.properties?.postalcode ||
              (typeof feature?.place_name === 'string' ? feature.place_name.split(',')[0] : undefined);

            if (code) {
              setPostalCode(code as string);
            }
          } catch (err) {
            console.error('Reverse geocoding failed', err);
          } finally {
            setLocating(false);
          }
        })();
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

      const effectiveVitals: VitalsPayload = vitals ?? { heartRate: 75, respiratoryRate: 16, stressIndex: 0.3 };

      const routeBody: Record<string, unknown> = {
        severity: undefined as TriageResponse['severity'] | undefined,
        city: 'toronto',
        symptoms: sym,
      };

      try {
        const triageController = new AbortController();
        const triageTimeout = setTimeout(() => triageController.abort(), API_TIMEOUT_MS);

        const triageRes = await fetch('/api/clearpath/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vitals: effectiveVitals,
            symptoms: sym,
            city: 'toronto',
          }),
          signal: triageController.signal,
        });

        clearTimeout(triageTimeout);

        if (!triageRes.ok) {
          let message = 'Unable to analyze symptoms right now. Please try again.';
          try {
            const errBody = (await triageRes.json()) as { error?: string };
            if (errBody?.error) message = errBody.error;
          } catch {
            // use default message
          }
          setError(message);
          setStep('symptoms');
          return;
        }

        let triage: TriageResponse;
        try {
          const json = await triageRes.json();
          if (json && typeof json.severity === 'string' && typeof json.reasoning === 'string') {
            triage = { severity: json.severity, reasoning: json.reasoning };
          } else {
            setError('Unable to analyze symptoms right now. Please try again.');
            setStep('symptoms');
            return;
          }
        } catch {
          setError('Unable to analyze symptoms right now. Please try again.');
          setStep('symptoms');
          return;
        }

        setTriageResult(triage);
        routeBody.severity = triage.severity;

        if (userCoords) {
          routeBody.userLat = userCoords.lat;
          routeBody.userLng = userCoords.lng;
        } else if (postalCode.trim()) {
          routeBody.postalCode = postalCode.trim();
        } else {
          routeBody.userLat = 43.6532;
          routeBody.userLng = -79.3832;
        }

        const routeController = new AbortController();
        const routeTimeout = setTimeout(() => routeController.abort(), API_TIMEOUT_MS);

        const routeRes = await fetch('/api/clearpath/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeBody),
          signal: routeController.signal,
        });

        clearTimeout(routeTimeout);

        if (!routeRes.ok) {
          let message = 'No hospitals found nearby. Please try again.';
          try {
            const errBody = (await routeRes.json()) as { error?: string };
            if (errBody?.error) message = errBody.error;
          } catch {
            // use default
          }
          setError(message);
          setStep('symptoms');
          return;
        }

        let route: RouteResponse;
        try {
          const json = await routeRes.json();
          if (json?.recommended && Array.isArray(json?.alternatives) && json?.userLocation) {
            route = json as RouteResponse;
          } else {
            setError('No hospitals found nearby. Please try again.');
            setStep('symptoms');
            return;
          }
        } catch {
          setError('No hospitals found nearby. Please try again.');
          setStep('symptoms');
          return;
        }

        setRouteResult(route);
        const rec = route.recommended;
        const h = rec?.hospital as { id?: string; _id?: string } | undefined;
        setActiveRouteId(h?.id ?? h?._id ?? null);
        onRecommendation(route, routeBody);
        setStep('result');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request took too long. Please try again.');
        } else {
          setError('Unable to analyze symptoms right now. Please try again.');
        }
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
    setActiveRouteId(null);
    setUserCoords(null);
    setError(null);
    onRecommendation(null);
  };

  const handleShowRoute = useCallback(
    (scored: ScoredHospital) => {
      if (!routeResult) return;
      const h = scored.hospital as { id?: string; _id?: string };
      const hId = h?.id ?? h?._id ?? null;
      if (hId && hId === activeRouteId) return;
      setActiveRouteId(hId);
      const updated = {
        ...routeResult,
        activeRoute: scored,
      };
      onRecommendation(updated, undefined);
    },
    [routeResult, activeRouteId, onRecommendation]
  );

  const canStart = postalCode.trim().length > 0 || userCoords !== null;

  return (
    <div className="h-full bg-white/95 backdrop-blur-xl shadow-xl border border-sky-100 rounded-3xl p-5 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-black text-sky-700 uppercase tracking-tight">
          ClearPath
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
              className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
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
            className={`w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors ${canStart
              ? 'bg-sky-500 hover:bg-sky-600 text-white'
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
          <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4" />
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
          onShowRoute={handleShowRoute}
          activeRouteId={activeRouteId}
        />
      )}

      <div className="mt-8 pt-4 border-t border-slate-100">
        <div className="flex gap-1.5">
          {(['address', 'vitals', 'symptoms', 'result'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${(['address', 'vitals', 'symptoms', 'loading', 'result'] as Step[]).indexOf(step) >= i
                ? 'bg-sky-500'
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
