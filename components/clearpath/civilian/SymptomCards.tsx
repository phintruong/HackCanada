'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SymptomsPayload } from '@/lib/clearpath/types';

interface SymptomCardsProps {
  onComplete: (symptoms: SymptomsPayload) => void;
}

const symptoms = [
  { key: 'chestPain', label: 'Chest Pain' },
  { key: 'shortnessOfBreath', label: 'Shortness of Breath' },
  { key: 'fever', label: 'Fever' },
  { key: 'dizziness', label: 'Dizziness' },
] as const;

export default function SymptomCards({ onComplete }: SymptomCardsProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [feverDays, setFeverDays] = useState<number | ''>(1);
  const [freeText, setFreeText] = useState('');

  const toggle = (key: string) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = () => {
    onComplete({
      chestPain: !!selected.chestPain,
      shortnessOfBreath: !!selected.shortnessOfBreath,
      fever: !!selected.fever,
      feverDays: selected.fever && typeof feverDays === 'number' ? feverDays : undefined,
      dizziness: !!selected.dizziness,
      freeText: freeText.trim() || undefined,
    });
  };

  return (
    <div className="space-y-3.5">
      <h3 className="civ-section-title">Symptom Check</h3>

      <div className="grid grid-cols-2 gap-2">
        {symptoms.map((s) => {
          const active = !!selected[s.key];
          return (
            <motion.button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`civ-symptom-card ${active ? 'civ-symptom-card--active' : ''}`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              layout
            >
              <span className={`civ-symptom-dot ${active ? 'civ-symptom-dot--active' : ''}`} />
              <span className="text-[11px] font-semibold text-slate-700">{s.label}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? 'text-sky-600' : 'text-slate-300'}`}>
                {active ? 'YES' : 'NO'}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected.fever && (
          <motion.div
            className="civ-field-group bg-amber-50/60 border border-amber-200/50 rounded-xl p-3"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label className="civ-label text-amber-700">How many days of fever?</label>
            <input
              type="number" min={1} max={30} value={feverDays}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') { setFeverDays(''); return; }
                const n = parseInt(v, 10);
                if (!Number.isNaN(n)) setFeverDays(n);
              }}
              className="civ-input border-amber-200 focus:ring-amber-400"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="civ-field-group">
        <label className="civ-label">Describe your main symptom</label>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="e.g. sharp pain in lower abdomen for 2 hours..."
          rows={3}
          className="civ-input civ-textarea"
        />
      </div>

      <motion.button
        onClick={handleSubmit}
        className="civ-btn civ-btn--danger w-full"
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        Get Triage Assessment
      </motion.button>
    </div>
  );
}
