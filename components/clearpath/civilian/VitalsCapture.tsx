'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { VitalsPayload } from '@/lib/clearpath/types';
import type { PresageVitals } from '@/lib/clearpath/types';

const CAPTURE_DURATION_SECONDS = 10; // Real rPPG needs ~10–15s minimum for accuracy.
const CAPTURE_INTERVAL_MS = 300; // 250–400ms for frame sampling
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const MAX_FRAMES = 40;
const PRESAGE_FETCH_TIMEOUT_MS = 20_000;

type CaptureState = 'initializing' | 'capturing' | 'analyzing' | 'manualFallback' | 'complete' | 'waitingPhoneScan';

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
  const [phoneScanSessionId, setPhoneScanSessionId] = useState<string | null>(null);
  const [phoneScanConnectionLost, setPhoneScanConnectionLost] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const vitalsReceivedRef = useRef(false);

  const closePhoneScanSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {
        /* ignore */
      }
      socketRef.current = null;
    }
  }, []);

  const startPhoneScan = useCallback(async () => {
    setPhoneScanConnectionLost(false);
    vitalsReceivedRef.current = false;
    closePhoneScanSocket();

    try {
      const res = await fetch('/api/scan/session');
      if (!res.ok) throw new Error('Session failed');
      const { sessionId } = (await res.json()) as { sessionId: string };
      if (!sessionId) throw new Error('No session ID');
      setPhoneScanSessionId(sessionId);
      setCaptureState('waitingPhoneScan');

      const protocol = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const wsPort = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_PORT ? process.env.NEXT_PUBLIC_WS_PORT : (typeof window !== 'undefined' ? window.location.port : '3000');
      const wsUrl = `${protocol}//${host}:${wsPort}/ws`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'laptop', sessionId }));
      };

      socket.onmessage = (event) => {
        if (vitalsReceivedRef.current) return;
        try {
          const data = JSON.parse(event.data as string) as { type?: string; hr?: number; rr?: number; stress?: number };
          if (data?.type !== 'vitals' || typeof data.hr !== 'number' || typeof data.rr !== 'number' || typeof data.stress !== 'number') return;
          vitalsReceivedRef.current = true;
          closePhoneScanSocket();
          onComplete({
            heartRate: clampHeartRate(data.hr),
            respiratoryRate: clampRespiratoryRate(data.rr),
            stressIndex: clampStressIndex(data.stress),
          });
          setCaptureState('complete');
        } catch {
          /* ignore */
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (!vitalsReceivedRef.current) setPhoneScanConnectionLost(true);
      };

      socket.onerror = () => {
        if (!vitalsReceivedRef.current) setPhoneScanConnectionLost(true);
      };
    } catch {
      setPhoneScanConnectionLost(true);
      setCaptureState('waitingPhoneScan');
      setPhoneScanSessionId(null);
    }
  }, [onComplete, closePhoneScanSocket]);

  const retryPhoneScan = useCallback(() => {
    closePhoneScanSocket();
    setPhoneScanConnectionLost(false);
    startPhoneScan();
  }, [closePhoneScanSocket, startPhoneScan]);

  const exitPhoneScan = useCallback(() => {
    closePhoneScanSocket();
    setPhoneScanSessionId(null);
    setPhoneScanConnectionLost(false);
    setCaptureState('initializing');
  }, [closePhoneScanSocket]);

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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      streamRef.current = stream;
      setCaptureState('capturing');

      const frames: string[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        switchToManualFallback('Could not create capture context.');
        return;
      }

      const startTime = Date.now();
      intervalRef.current = setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;

        const elapsedSec = (Date.now() - startTime) / 1000;
        if (frames.length < MAX_FRAMES) {
          ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          frames.push(dataUrl);
        }
        const progressPct = Math.min(100, (elapsedSec / CAPTURE_DURATION_SECONDS) * 100);
        setProgress(progressPct);

        if (elapsedSec >= CAPTURE_DURATION_SECONDS) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          if (frames.length === 0) {
            switchToManualFallback('No frames captured. Please try again.');
            return;
          }

          setCaptureState('analyzing');
          setProgress(100);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), PRESAGE_FETCH_TIMEOUT_MS);

          fetch('/api/presage/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frames }),
            signal: controller.signal,
          })
            .then((res) => {
              clearTimeout(timeoutId);
              if (!res.ok) {
                return res.json().then((j) => Promise.reject(new Error((j as { error?: string })?.error ?? res.statusText)));
              }
              return res.json() as Promise<PresageVitals>;
            })
            .then((vitals: PresageVitals) => {
              const hr = clampHeartRate(vitals.hr);
              const rr = clampRespiratoryRate(vitals.rr);
              const stress = clampStressIndex(vitals.stress);
              setLiveHeartRate(hr);
              setLiveRespiratoryRate(rr);
              setLiveStressIndex(stress);
              setCaptureState('complete');
              onComplete({
                heartRate: hr,
                respiratoryRate: rr,
                stressIndex: stress,
              });
            })
            .catch(() => {
              clearTimeout(timeoutId);
              switchToManualFallback('Face analysis failed. Please enter vitals manually.');
            });
        }
      }, CAPTURE_INTERVAL_MS);
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
      closePhoneScanSocket();
    };
  }, [closePhoneScanSocket]);

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

  if (captureState === 'waitingPhoneScan') {
    const scanUrl =
      typeof window !== 'undefined' && phoneScanSessionId
        ? `${window.location.origin}/scan?session=${encodeURIComponent(phoneScanSessionId)}${process.env.NEXT_PUBLIC_WS_PORT ? `&wsPort=${process.env.NEXT_PUBLIC_WS_PORT}` : ''}`
        : '';
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Scan with phone
        </h3>
        {phoneScanConnectionLost ? (
          <>
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Connection lost. Please scan again.
            </p>
            <div className="flex gap-2">
              <button
                onClick={retryPhoneScan}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold uppercase"
              >
                Try again
              </button>
              <button
                onClick={exitPhoneScan}
                className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] text-slate-500">
              Scan the QR code with the ClearPath iOS app to capture vitals.
            </p>
            {scanUrl ? (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={scanUrl} size={256} level="M" />
              </div>
            ) : (
              <p className="text-[11px] text-amber-700">Loading session…</p>
            )}
            <button
              onClick={exitPhoneScan}
              className="w-full text-[11px] text-slate-400 hover:text-slate-600 underline"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    );
  }

  if (captureState === 'capturing' || captureState === 'analyzing') {
    return (
      <div className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 w-full max-w-xl px-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {captureState === 'analyzing' ? 'Analyzing…' : 'Scanning Vitals'}
          </h3>
          <p className="text-xs text-white/60 -mt-4">
            {captureState === 'analyzing'
              ? 'Please wait'
              : 'Look directly at the camera and hold still'}
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
        Use your camera for a {CAPTURE_DURATION_SECONDS}-second measurement, scan with the iOS app, or enter vitals manually.
      </p>
      <button
        onClick={startCameraCapture}
        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold uppercase"
      >
        Start {CAPTURE_DURATION_SECONDS}s Capture
      </button>
      <button
        onClick={startPhoneScan}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold uppercase"
      >
        Scan with phone
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
