'use client';

interface ModeToggleProps {
  mode: 'government' | 'civilian';
  onChange: (mode: 'government' | 'civilian') => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-white/95 p-1 shadow-lg border border-sky-200/80 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => onChange('government')}
        className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
          mode === 'government'
            ? 'bg-sky-500 text-white shadow-md'
            : 'bg-transparent text-slate-600 hover:bg-sky-50 hover:text-sky-700'
        }`}
      >
        Government
      </button>
      <button
        type="button"
        onClick={() => onChange('civilian')}
        className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
          mode === 'civilian'
            ? 'bg-amber-400 text-amber-950 shadow-md'
            : 'bg-transparent text-slate-600 hover:bg-amber-50 hover:text-amber-800'
        }`}
      >
        Civilian
      </button>
    </div>
  );
}
