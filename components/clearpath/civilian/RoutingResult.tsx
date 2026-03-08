'use client';

import { useState } from 'react';
import { ScoredHospital } from '@/lib/clearpath/types';

interface RoutingResultProps {
  severity: 'critical' | 'urgent' | 'non-urgent';
  reasoning: string;
  recommended: ScoredHospital;
  alternatives: ScoredHospital[];
  onBack: () => void;
  onShowRoute?: (scored: ScoredHospital) => void;
  activeRouteId?: string | null;
}

const severityConfig = {
  critical: { bg: 'bg-red-600', text: 'text-white', label: 'CRITICAL' },
  urgent: { bg: 'bg-orange-500', text: 'text-white', label: 'URGENT' },
  'non-urgent': { bg: 'bg-green-500', text: 'text-white', label: 'NON-URGENT' },
};

function HospitalCard({ scored, rank, onShowRoute, isRouteActive }: { scored: ScoredHospital; rank: number; onShowRoute?: (scored: ScoredHospital) => void; isRouteActive?: boolean }) {
  const h = scored.hospital;
  return (
    <div className={`bg-white border rounded-lg p-4 space-y-3 ${rank === 1 ? 'border-blue-300 shadow-md' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          {rank === 1 && (
            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
              Best Match
            </span>
          )}
          <p className={`font-readable font-semibold ${rank === 1 ? 'text-base text-blue-700' : 'text-sm text-slate-700'}`}>
            {h.name}
          </p>
        </div>
        {scored.specialtyMatch && (
          <span className="text-[9px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold uppercase">
            Specialty
          </span>
        )}
      </div>

      <div className={`grid ${rank === 1 ? 'grid-cols-3' : 'grid-cols-3'} gap-2`}>
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <p className="text-[8px] font-bold text-blue-500 uppercase">Drive</p>
          <p className={`font-black text-blue-800 ${rank === 1 ? 'text-lg' : 'text-sm'}`}>
            {scored.drivingTimeMinutes}m
          </p>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <p className="text-[8px] font-bold text-amber-500 uppercase">Wait</p>
          <p className={`font-black text-amber-800 ${rank === 1 ? 'text-lg' : 'text-sm'}`}>
            {scored.adjustedWaitMinutes}m
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <p className="text-[8px] font-bold text-green-500 uppercase">Total</p>
          <p className={`font-black text-green-800 ${rank === 1 ? 'text-lg' : 'text-sm'}`}>
            {scored.totalEstimatedMinutes}m
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        <span>{scored.distanceKm} km</span>
        <span>|</span>
        <span>{scored.occupancyPct}% full</span>
      </div>

      <p className="text-[11px] text-slate-600 leading-relaxed">{scored.reason}</p>

      {h.phone && (
        <a
          href={`tel:${h.phone}`}
          className="block w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold text-center uppercase transition-colors"
        >
          Call {h.phone}
        </a>
      )}

      {onShowRoute && !isRouteActive && (
        <button
          onClick={() => onShowRoute(scored)}
          className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Show Route
        </button>
      )}

      {isRouteActive && (
        <div className="w-full py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[11px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Route Shown
        </div>
      )}
    </div>
  );
}

export default function RoutingResult({
  severity,
  reasoning,
  recommended,
  alternatives,
  onBack,
  onShowRoute,
  activeRouteId,
}: RoutingResultProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const config = severityConfig[severity];

  return (
    <div className="space-y-4">
      <div className={`${config.bg} rounded-lg p-4 text-center`}>
        <p className={`text-[10px] font-bold ${config.text} uppercase tracking-widest opacity-80`}>
          Triage Level
        </p>
        <p className={`text-2xl font-black ${config.text} uppercase tracking-tight`}>
          {config.label}
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">AI Assessment</p>
        <p className="text-[11px] text-slate-700 leading-relaxed">{reasoning}</p>
      </div>

      <HospitalCard scored={recommended} rank={1} onShowRoute={onShowRoute} isRouteActive={(recommended.hospital?.id ?? (recommended.hospital as any)?._id) === activeRouteId} />

      {alternatives.length > 0 && (
        <div>
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="w-full py-2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 transition-colors"
          >
            {showAlternatives ? 'Hide' : 'Show'} {alternatives.length} alternative{alternatives.length > 1 ? 's' : ''}
            <svg
              className={`w-3 h-3 transition-transform ${showAlternatives ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAlternatives && (
            <div className="space-y-3 mt-2">
              {alternatives.map((alt, i) => (
                <HospitalCard key={alt.hospital.id || i} scored={alt} rank={i + 2} onShowRoute={onShowRoute} isRouteActive={(alt.hospital?.id ?? (alt.hospital as any)?._id) === activeRouteId} />
              ))}
            </div>
          )}
        </div>
      )}

      {severity === 'critical' && (
        <a
          href="tel:911"
          className="block w-full py-3 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-black text-center uppercase tracking-wide transition-colors"
        >
          Call 911
        </a>
      )}

      <button
        onClick={onBack}
        className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
      >
        Start Over
      </button>
    </div>
  );
}
