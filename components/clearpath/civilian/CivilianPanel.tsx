'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceTriage from './VoiceTriage';
import RoutingResult from './RoutingResult';
import type { TriageResponse, RouteResponse, ScoredHospital } from '@/lib/clearpath/types';

const API_TIMEOUT_MS = 15_000;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

interface CivilianPanelProps {
  cityId: string;
  onRecommendation: (result: RouteResponse | null, routeParams?: Record<string, unknown>) => void;
  currentRecommendation?: RouteResponse & { activeRoute?: ScoredHospital } | null;
}

type Step = 'location' | 'conversation' | 'loading' | 'result';
const STEP_ORDER: Step[] = ['location', 'conversation', 'loading', 'result'];

function stepIndex(s: Step) { return STEP_ORDER.indexOf(s); }

export default function CivilianPanel({ cityId, onRecommendation, currentRecommendation }: CivilianPanelProps) {
  const [step, setStep] = useState<Step>('location');
  const [direction, setDirection] = useState(1);
  const [postalCode, setPostalCode] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResponse | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goTo = useCallback((next: Step) => {
    setDirection(stepIndex(next) >= stepIndex(step) ? 1 : -1);
    setStep(next);
  }, [step]);

  useEffect(() => {
    if (currentRecommendation && currentRecommendation !== routeResult) {
      setRouteResult(currentRecommendation);
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
      setError('Location is not supported on this device.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        (async () => {
          try {
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            if (!token) return;

            const url =
              `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
              `${coords.lng},${coords.lat}.json` +
              `?country=ca&types=postcode&limit=1&access_token=${token}`;

            const res = await fetch(url);
            if (!res.ok) return;
            const data = (await res.json()) as { features?: Array<{ text?: string; properties?: { postalcode?: string }; place_name?: string }> };
            const feature = data.features?.[0];
            const code = feature?.text || feature?.properties?.postalcode || (typeof feature?.place_name === 'string' ? feature.place_name.split(',')[0] : undefined);
            if (code) setPostalCode(code as string);
          } catch (err) { console.error('Reverse geocoding failed', err); }
          finally { setLocating(false); }
        })();
      },
      () => { setError('Could not get your location.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // When voice triage is complete, route the patient
  const handleTriageComplete = useCallback(
    async (triage: { severity: 'critical' | 'urgent' | 'non-urgent'; reasoning: string; symptoms: { chestPain: boolean; shortnessOfBreath: boolean; fever: boolean; dizziness: boolean; freeText?: string } | null }) => {
      setTriageResult({ severity: triage.severity, reasoning: triage.reasoning });
      goTo('loading');
      setError(null);

      const routeBody: Record<string, unknown> = {
        severity: triage.severity,
        city: cityId,
        symptoms: triage.symptoms || {
          chestPain: false,
          shortnessOfBreath: false,
          fever: false,
          dizziness: false,
          freeText: triage.reasoning,
        },
      };

      if (userCoords) {
        routeBody.userLat = userCoords.lat;
        routeBody.userLng = userCoords.lng;
      } else if (postalCode.trim()) {
        routeBody.postalCode = postalCode.trim();
      } else {
        routeBody.userLat = 43.6532;
        routeBody.userLng = -79.3832;
      }

      try {
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
          } catch { /* use default */ }
          setError(message);
          goTo('conversation');
          return;
        }

        let route: RouteResponse;
        try {
          const json = await routeRes.json();
          if (json?.recommended && Array.isArray(json?.alternatives) && json?.userLocation) {
            route = json as RouteResponse;
          } else {
            setError('No hospitals found nearby. Please try again.');
            goTo('conversation');
            return;
          }
        } catch {
          setError('No hospitals found nearby. Please try again.');
          goTo('conversation');
          return;
        }

        setRouteResult(route);
        const rec = route.recommended;
        const h = rec?.hospital as { id?: string; _id?: string } | undefined;
        setActiveRouteId(h?.id ?? h?._id ?? null);
        onRecommendation(route, routeBody);
        goTo('result');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request took too long. Please try again.');
        } else {
          setError('Unable to find hospitals right now. Please try again.');
        }
        goTo('conversation');
        console.error(err);
      }
    },
    [cityId, userCoords, postalCode, onRecommendation, goTo]
  );

  const resetFlow = () => {
    setDirection(-1);
    setStep('location');
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
      const updated = { ...routeResult, activeRoute: scored };
      onRecommendation(updated, undefined);
    },
    [routeResult, activeRouteId, onRecommendation]
  );

  const canStart = postalCode.trim().length > 0 || userCoords !== null;
  const currentStepIdx = stepIndex(step);

  return (
    <div className="civ-panel">
      {/* Header */}
      <div className="civ-header">
        <div className="civ-header-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div>
          <h2 className="civ-header-title">ERoute</h2>
          <p className="civ-header-sub">Find the right ER for your situation</p>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="civ-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      <div className="civ-body">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 'location' && (
            <motion.div key="location" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <div className="space-y-3.5">
                <div className="civ-field-group">
                  <label className="civ-label">Your Postal Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => { setPostalCode(e.target.value); setUserCoords(null); }}
                    placeholder="e.g. M5B 1W8"
                    className="civ-input"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200/60" />
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-slate-200/60" />
                </div>

                <div className="civ-actions-row">
                  <motion.button
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    className="civ-btn civ-btn--location w-full justify-center"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {locating ? (
                      <><div className="civ-spinner" />Locating...</>
                    ) : userCoords ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>Location detected</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Use My Location</>
                    )}
                  </motion.button>

                  <motion.button
                    onClick={() => goTo('conversation')}
                    disabled={!canStart}
                    className={`civ-btn civ-btn--primary w-full justify-center ${!canStart ? 'civ-btn--disabled' : ''}`}
                    whileHover={canStart ? { scale: 1.01, y: -1 } : {}}
                    whileTap={canStart ? { scale: 0.98 } : {}}
                  >
                    Start Triage
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'conversation' && (
            <motion.div key="conversation" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <VoiceTriage onTriageComplete={handleTriageComplete} />
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <div className="flex flex-col items-center justify-center py-14">
                <motion.div
                  className="civ-loader"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
                <p className="text-sm font-bold text-slate-700 mt-4">Finding the best ER for you...</p>
                <p className="text-xs text-slate-400 mt-1">Computing optimal route with live traffic</p>
              </div>
            </motion.div>
          )}

          {step === 'result' && triageResult && routeResult && (
            <motion.div key="result" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <RoutingResult
                severity={triageResult.severity}
                reasoning={triageResult.reasoning}
                recommended={routeResult.recommended}
                alternatives={routeResult.alternatives}
                onBack={resetFlow}
                onShowRoute={handleShowRoute}
                activeRouteId={activeRouteId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Progress */}
      <div className="civ-progress">
        <div className="civ-progress-bar">
          {(['location', 'conversation', 'result'] as Step[]).map((s, i) => (
            <motion.div
              key={s}
              className="civ-progress-segment"
              animate={{ backgroundColor: currentStepIdx >= i ? '#0ea5e9' : 'rgba(148,163,184,0.2)' }}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>
        <p className="civ-progress-label">
          {step === 'location' && 'Step 1 of 3 — Location'}
          {step === 'conversation' && 'Step 2 of 3 — Tell us what happened'}
          {step === 'loading' && 'Finding your ER...'}
          {step === 'result' && 'Step 3 of 3 — Result'}
        </p>
      </div>
    </div>
  );
}
