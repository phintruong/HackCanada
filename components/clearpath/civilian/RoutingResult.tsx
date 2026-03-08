'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  critical: { gradient: 'from-red-600 to-red-700', label: 'CRITICAL', ring: 'ring-red-500/20' },
  urgent: { gradient: 'from-orange-500 to-orange-600', label: 'URGENT', ring: 'ring-orange-500/20' },
  'non-urgent': { gradient: 'from-emerald-500 to-emerald-600', label: 'NON-URGENT', ring: 'ring-emerald-500/20' },
};

function HospitalCard({ scored, rank, onShowRoute, isRouteActive }: { scored: ScoredHospital; rank: number; onShowRoute?: (scored: ScoredHospital) => void; isRouteActive?: boolean }) {
  const h = scored.hospital;
  const isTop = rank === 1;

  return (
    <motion.div
      className={`civ-hospital-card ${isTop ? 'civ-hospital-card--top' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: rank * 0.08 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {isTop && <span className="civ-badge civ-badge--sky">Best Match</span>}
          <p className={`font-semibold truncate ${isTop ? 'text-sm text-sky-800' : 'text-xs text-slate-700'}`}>
            {h.name}
          </p>
        </div>
        {scored.specialtyMatch && <span className="civ-badge civ-badge--purple">Specialty</span>}
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-2.5">
        {[
          { label: 'Drive', value: `${scored.drivingTimeMinutes}m`, bg: 'bg-sky-50/80', color: 'text-sky-700' },
          { label: 'Wait', value: `${scored.adjustedWaitMinutes}m`, bg: 'bg-amber-50/80', color: 'text-amber-700' },
          { label: 'Total', value: `${scored.totalEstimatedMinutes}m`, bg: 'bg-emerald-50/80', color: 'text-emerald-700' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-lg p-1.5 text-center`}>
            <p className="text-[7px] font-bold text-slate-400 uppercase">{stat.label}</p>
            <p className={`font-black ${stat.color} ${isTop ? 'text-base' : 'text-sm'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2">
        <span>{scored.distanceKm} km</span>
        <span className="text-slate-200">|</span>
        <span>{scored.occupancyPct}% full</span>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">{scored.reason}</p>

      {h.phone && (
        <motion.a
          href={`tel:${h.phone}`}
          className="civ-btn civ-btn--green w-full mt-2.5 text-center justify-center"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        >
          Call {h.phone}
        </motion.a>
      )}

      {onShowRoute && !isRouteActive && (
        <motion.button
          onClick={() => onShowRoute(scored)}
          className="civ-btn civ-btn--location w-full mt-1.5 justify-center"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Show Route
        </motion.button>
      )}

      {isRouteActive && (
        <div className="civ-btn civ-btn--route-active w-full mt-1.5 justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          Route Shown
        </div>
      )}
    </motion.div>
  );
}

export default function RoutingResult({ severity, reasoning, recommended, alternatives, onBack, onShowRoute, activeRouteId }: RoutingResultProps) {
  const [showAlts, setShowAlts] = useState(false);
  const config = severityConfig[severity];

  return (
    <div className="space-y-3.5">
      {/* Severity badge */}
      <motion.div
        className={`bg-gradient-to-br ${config.gradient} rounded-2xl p-4 text-center ring-4 ${config.ring}`}
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <p className="text-[9px] font-bold text-white/70 uppercase tracking-[0.15em]">Triage Level</p>
        <p className="text-xl font-black text-white uppercase tracking-tight">{config.label}</p>
      </motion.div>

      {/* Reasoning */}
      <motion.div
        className="civ-glass rounded-xl p-3"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      >
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">AI Assessment</p>
        <p className="text-[11px] text-slate-600 leading-relaxed">{reasoning}</p>
      </motion.div>

      {/* Recommended */}
      <HospitalCard scored={recommended} rank={1} onShowRoute={onShowRoute} isRouteActive={(recommended.hospital?.id ?? (recommended.hospital as any)?._id) === activeRouteId} />

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div>
          <motion.button
            onClick={() => setShowAlts(!showAlts)}
            className="w-full py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            {showAlts ? 'Hide' : 'Show'} {alternatives.length} alternative{alternatives.length > 1 ? 's' : ''}
            <motion.svg
              className="w-3 h-3"
              animate={{ rotate: showAlts ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </motion.button>

          <AnimatePresence>
            {showAlts && (
              <motion.div
                className="space-y-2.5 mt-1"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35 }}
              >
                {alternatives.map((alt, i) => (
                  <HospitalCard key={alt.hospital.id || i} scored={alt} rank={i + 2} onShowRoute={onShowRoute} isRouteActive={(alt.hospital?.id ?? (alt.hospital as any)?._id) === activeRouteId} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 911 */}
      {severity === 'critical' && (
        <motion.a
          href="tel:911"
          className="civ-btn civ-btn--911 w-full text-center justify-center"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call 911
        </motion.a>
      )}

      {/* Start over */}
      <motion.button
        onClick={onBack}
        className="civ-btn civ-btn--ghost w-full justify-center"
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      >
        Start Over
      </motion.button>
    </div>
  );
}
