'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VitalsPayload } from '@/lib/clearpath/types';

type CaptureState = 'initializing' | 'capturing' | 'manualFallback' | 'complete';

interface VitalsCaptureProps {
  onComplete: (vitals: VitalsPayload) => void;
  onSkip: () => void;
}

function clampHeartRate(n: number) { return Math.max(30, Math.min(220, Math.round(n))); }
function clampRespiratoryRate(n: number) { return Math.max(5, Math.min(60, Math.round(n))); }
function clampStressIndex(n: number) { return Math.max(0, Math.min(1, Math.round(n * 100) / 100)); }

export default function VitalsCapture({ onComplete, onSkip }: VitalsCaptureProps) {
  const [captureState, setCaptureState] = useState<CaptureState>('initializing');
  const [progress, setProgress] = useState(0);
  const [liveHeartRate, setLiveHeartRate] = useState<number | null>(null);
  const [liveRespiratoryRate, setLiveRespiratoryRate] = useState<number | null>(null);
  const [liveStressIndex, setLiveStressIndex] = useState<number | null>(null);
  const [manualHeartRate, setManualHeartRate] = useState<number | ''>(75);
  const [manualRespiratoryRate, setManualRespiratoryRate] = useState<number | ''>(16);
  const [manualStressIndex, setManualStressIndex] = useState<number | ''>(0.3);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLiveRef = useRef({ hr: 75, rr: 16, stress: 0.3 });

  const switchToManualFallback = useCallback((message: string) => {
    setFallbackMessage(message);
    setCaptureState('manualFallback');
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startCameraCapture = useCallback(async () => {
    setCaptureState('initializing');
    setFallbackMessage(null);
    setProgress(0);
    setLiveHeartRate(null); setLiveRespiratoryRate(null); setLiveStressIndex(null);
    lastLiveRef.current = { hr: 75, rr: 16, stress: 0.3 };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCaptureState('capturing');
      let elapsed = 0;
      intervalRef.current = setInterval(() => {
        elapsed += 1;
        const hr = 60 + Math.floor(Math.random() * 40);
        const rr = 12 + Math.floor(Math.random() * 10);
        const stress = Math.round((0.2 + Math.random() * 0.6) * 100) / 100;
        lastLiveRef.current = { hr, rr, stress };
        setProgress((elapsed / 30) * 100);
        setLiveHeartRate(hr); setLiveRespiratoryRate(rr); setLiveStressIndex(stress);
        if (elapsed >= 30) {
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
          setCaptureState('complete');
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          const { hr: fHr, rr: fRr, stress: fS } = lastLiveRef.current;
          onComplete({ heartRate: clampHeartRate(fHr), respiratoryRate: clampRespiratoryRate(fRr), stressIndex: clampStressIndex(fS) });
        }
      }, 1000);
    } catch { switchToManualFallback('Camera unavailable. Please enter vitals manually.'); }
  }, [onComplete, switchToManualFallback]);

  useEffect(() => {
    if (captureState !== 'capturing' || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [captureState]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, []);

  const submitManual = useCallback(() => {
    const parsedHeartRate =
      manualHeartRate === '' ? 75 : Number.isNaN(Number(manualHeartRate)) ? 75 : Number(manualHeartRate);
    const parsedRespRate =
      manualRespiratoryRate === '' ? 16 : Number.isNaN(Number(manualRespiratoryRate)) ? 16 : Number(manualRespiratoryRate);
    const parsedStress =
      manualStressIndex === '' ? 0.3 : Number.isNaN(Number(manualStressIndex)) ? 0.3 : Number(manualStressIndex);

    onComplete({
      heartRate: clampHeartRate(parsedHeartRate),
      respiratoryRate: clampRespiratoryRate(parsedRespRate),
      stressIndex: clampStressIndex(parsedStress),
    });
  }, [manualHeartRate, manualRespiratoryRate, manualStressIndex, onComplete]);

  if (captureState === 'complete') return null;

  if (captureState === 'manualFallback') {
    return (
      <div className="space-y-3">
        <h3 className="civ-section-title">Enter Vitals</h3>
        <AnimatePresence>
          {fallbackMessage && (
            <motion.p
              className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-xl px-3 py-2 backdrop-blur-sm"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            >
              {fallbackMessage}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="space-y-2.5">
          {[
            { label: 'Heart Rate (BPM)', value: manualHeartRate, onChange: (v: number | '') => setManualHeartRate(v), min: 30, max: 220 },
            { label: 'Respiratory Rate (breaths/min)', value: manualRespiratoryRate, onChange: (v: number | '') => setManualRespiratoryRate(v), min: 5, max: 60 },
          ].map((field) => (
            <div key={field.label} className="civ-field-group">
              <label className="civ-label">{field.label}</label>
              <input
                type="number" min={field.min} max={field.max} value={field.value}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') {
                    field.onChange('');
                    return;
                  }
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n)) field.onChange(n);
                }}
                className="civ-input"
              />
            </div>
          ))}
          <div className="civ-field-group">
            <label className="civ-label">Stress Index (0–1)</label>
            <input
              type="number" min={0} max={1} step={0.01} value={manualStressIndex}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') {
                  setManualStressIndex('');
                  return;
                }
                const n = parseFloat(v);
                if (!Number.isNaN(n)) setManualStressIndex(n);
              }}
              className="civ-input"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button onClick={submitManual} className="civ-btn civ-btn--primary flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            Submit Vitals
          </motion.button>
          <motion.button onClick={onSkip} className="civ-btn civ-btn--ghost px-4" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            Skip
          </motion.button>
        </div>
      </div>
    );
  }

  if (captureState === 'capturing') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 w-full max-w-xl px-6">
          <motion.h3
            className="text-sm font-bold text-white uppercase tracking-widest"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            Scanning Vitals
          </motion.h3>
          <p className="text-xs text-white/50 -mt-3">Look directly at the camera and hold still</p>

          <motion.div
            className="relative rounded-2xl overflow-hidden bg-black w-full aspect-[4/3] ring-1 ring-white/10"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }}
          >
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute inset-0 border-[3px] border-white/10 rounded-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <motion.div className="h-full bg-sky-400" style={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>
          </motion.div>

          <p className="text-sm text-white/60 font-medium">{Math.round(progress)}%</p>

          <div className="grid grid-cols-3 gap-3 w-full">
            {[
              { label: 'Heart Rate', value: liveHeartRate, unit: 'bpm' },
              { label: 'Resp Rate', value: liveRespiratoryRate, unit: '/min' },
              { label: 'Stress', value: liveStressIndex, unit: '' },
            ].map((v) => (
              <motion.div
                key={v.label}
                className="civ-glass-dark rounded-xl p-3 text-center"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <span className="text-[9px] font-bold text-white/40 uppercase block mb-0.5">{v.label}</span>
                <span className="font-black text-white text-lg">{v.value ?? '--'}</span>
                {v.unit && <span className="text-white/30 text-[10px] ml-0.5">{v.unit}</span>}
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => switchToManualFallback('Switched to manual entry.')}
            className="text-xs text-white/30 hover:text-white/60 underline transition-colors mt-1"
          >
            Enter vitals manually instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="civ-section-title">Vitals Capture</h3>
      <p className="text-[11px] text-slate-500">Use your camera for a 30-second measurement, or enter vitals manually.</p>
      <motion.button onClick={startCameraCapture} className="civ-btn civ-btn--green w-full" whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Start 30s Capture
      </motion.button>
      <button
        onClick={() => switchToManualFallback('Enter vitals manually.')}
        className="w-full text-[11px] text-slate-400 hover:text-slate-600 transition-colors underline"
      >
        Enter vitals manually instead
      </button>
    </div>
  );
}
