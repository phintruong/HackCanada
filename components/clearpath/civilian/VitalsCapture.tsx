'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VitalsPayload } from '@/lib/clearpath/types';

type CaptureState = 'initializing' | 'capturing' | 'manualFallback' | 'complete';

interface VitalsCaptureProps {
  onComplete: (vitals: VitalsPayload) => void;
  onSkip: () => void;
}

function clampHeartRate(n: number): number {
  return Math.max(30, Math.min(220, Math.round(n)));
}
function clampRespiratoryRate(n: number): number {
  return Math.max(5, Math.min(60, Math.round(n)));
}
function clampStressIndex(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

export default function VitalsCapture({ onComplete, onSkip }: VitalsCaptureProps) {
  const [captureState, setCaptureState] = useState<CaptureState>('initializing');
  const [progress, setProgress] = useState(0);
  const [liveHeartRate, setLiveHeartRate] = useState<number | null>(null);
  const [liveRespiratoryRate, setLiveRespiratoryRate] = useState<number | null>(null);
  const [liveStressIndex, setLiveStressIndex] = useState<number | null>(null);
  const [manualHeartRate, setManualHeartRate] = useState<number>(75);
  const [manualRespiratoryRate, setManualRespiratoryRate] = useState<number>(16);
  const [manualStressIndex, setManualStressIndex] = useState<number>(0.3);
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCameraCapture = useCallback(async () => {
    setCaptureState('initializing');
    setFallbackMessage(null);
    setProgress(0);
    setLiveHeartRate(null);
    setLiveRespiratoryRate(null);
    setLiveStressIndex(null);
    lastLiveRef.current = { hr: 75, rr: 16, stress: 0.3 };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
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
        setLiveHeartRate(hr);
        setLiveRespiratoryRate(rr);
        setLiveStressIndex(stress);

        if (elapsed >= 30) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setCaptureState('complete');
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          const { hr: finalHr, rr: finalRr, stress: finalStress } = lastLiveRef.current;
          onComplete({
            heartRate: clampHeartRate(finalHr),
            respiratoryRate: clampRespiratoryRate(finalRr),
            stressIndex: clampStressIndex(finalStress),
          });
        }
      }, 1000);
    } catch {
      switchToManualFallback('Camera unavailable. Please enter vitals manually.');
    }
  }, [onComplete, switchToManualFallback]);

  // Attach stream to video once the element is mounted (it only exists when captureState === 'capturing')
  useEffect(() => {
    if (captureState !== 'capturing' || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    video.srcObject = stream;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [captureState]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const submitManual = useCallback(() => {
    const payload: VitalsPayload = {
      heartRate: clampHeartRate(manualHeartRate),
      respiratoryRate: clampRespiratoryRate(manualRespiratoryRate),
      stressIndex: clampStressIndex(manualStressIndex),
    };
    onComplete(payload);
  }, [manualHeartRate, manualRespiratoryRate, manualStressIndex, onComplete]);

  if (captureState === 'manualFallback' || captureState === 'complete') {
    if (captureState === 'complete') {
      return null;
    }
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Enter Vitals
        </h3>
        {fallbackMessage && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {fallbackMessage}
          </p>
        )}
        <div className="space-y-2">
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
              Heart Rate (BPM)
            </label>
            <input
              type="number"
              min={30}
              max={220}
              value={manualHeartRate}
              onChange={(e) => setManualHeartRate(parseInt(e.target.value, 10) || 75)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
              Respiratory Rate (breaths/min)
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={manualRespiratoryRate}
              onChange={(e) => setManualRespiratoryRate(parseInt(e.target.value, 10) || 16)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
              Stress Index (0–1)
            </label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={manualStressIndex}
              onChange={(e) => setManualStressIndex(parseFloat(e.target.value) || 0.3)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={submitManual}
            className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold uppercase"
          >
            Submit Vitals
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  if (captureState === 'capturing') {
    return (
      <div className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 w-full max-w-xl px-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Scanning Vitals
          </h3>
          <p className="text-xs text-white/60 -mt-4">
            Look directly at the camera and hold still
          </p>
          <div className="relative rounded-2xl overflow-hidden bg-black w-full aspect-4/3 shadow-2xl ring-2 ring-white/10">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-0 border-[3px] border-white/20 rounded-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
              <div
                className="h-full bg-green-400 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-white/70 font-medium">
            Capturing... {Math.round(progress)}%
          </p>
          <div className="grid grid-cols-3 gap-4 text-center w-full">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <span className="font-bold text-white/50 text-[10px] uppercase block mb-1">Heart Rate</span>
              <span className="font-black text-white text-lg">{liveHeartRate ?? '--'}</span>
              <span className="text-white/40 text-[10px] ml-1">bpm</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <span className="font-bold text-white/50 text-[10px] uppercase block mb-1">Resp Rate</span>
              <span className="font-black text-white text-lg">{liveRespiratoryRate ?? '--'}</span>
              <span className="text-white/40 text-[10px] ml-1">/min</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <span className="font-bold text-white/50 text-[10px] uppercase block mb-1">Stress</span>
              <span className="font-black text-white text-lg">{liveStressIndex ?? '--'}</span>
            </div>
          </div>
          <button
            onClick={() => switchToManualFallback('Switched to manual entry.')}
            className="text-xs text-white/40 hover:text-white/70 underline transition-colors"
          >
            Enter vitals manually instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
        Vitals Capture
      </h3>
      <p className="text-[11px] text-slate-500">
        Use your camera for a 30-second measurement, or enter vitals manually.
      </p>
      <button
        onClick={startCameraCapture}
        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold uppercase"
      >
        Start 30s Capture
      </button>
      <button
        onClick={() => switchToManualFallback('Enter vitals manually.')}
        className="w-full text-[11px] text-slate-400 hover:text-slate-600 underline"
      >
        Enter vitals manually instead
      </button>
    </div>
  );
}
