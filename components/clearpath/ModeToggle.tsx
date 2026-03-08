'use client';

import { motion } from 'framer-motion';

interface ModeToggleProps {
  mode: 'government' | 'civilian';
  onChange: (mode: 'government' | 'civilian') => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="civ-mode-toggle">
      {(['government', 'civilian'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`civ-mode-btn ${mode === m ? 'civ-mode-btn--active' : ''}`}
        >
          {mode === m && (
            <motion.div
              className="civ-mode-indicator"
              layoutId="mode-pill"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{m === 'government' ? 'Government' : 'Civilian'}</span>
        </button>
      ))}
    </div>
  );
}
