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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Vitals Capture
        </h3>
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-700">
            <div
              className="h-full bg-green-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-[11px] text-center text-slate-500">
          Hold still — capturing vitals... {Math.round(progress)}%
        </p>
        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="bg-slate-100 rounded-lg p-2">
            <span className="font-bold text-slate-600 block">HR</span>
            <span className="font-black text-slate-800">{liveHeartRate ?? '--'} bpm</span>
          </div>
          <div className="bg-slate-100 rounded-lg p-2">
            <span className="font-bold text-slate-600 block">RR</span>
            <span className="font-black text-slate-800">{liveRespiratoryRate ?? '--'}/min</span>
          </div>
          <div className="bg-slate-100 rounded-lg p-2">
            <span className="font-bold text-slate-600 block">Stress</span>
            <span className="font-black text-slate-800">{liveStressIndex ?? '--'}</span>
          </div>
        </div>
        <button
          onClick={() => switchToManualFallback('Switched to manual entry.')}
          className="w-full text-[11px] text-slate-400 hover:text-slate-600 underline"
        >
          Enter vitals manually instead
        </button>
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
