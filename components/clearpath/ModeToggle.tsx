'use client';

interface ModeToggleProps {
  mode: 'government' | 'civilian';
  onChange: (mode: 'government' | 'civilian') => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-slate-900/80 p-1 shadow-[0_14px_40px_rgba(15,23,42,0.6)] border border-white/15 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => onChange('government')}
        className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
          mode === 'government'
            ? 'bg-blue-500 text-white shadow-[0_10px_30px_rgba(15,23,42,0.8)]'
            : 'bg-transparent text-slate-200/80 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        Government
      </button>
      <button
        type="button"
        onClick={() => onChange('civilian')}
        className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
          mode === 'civilian'
            ? 'bg-red-500 text-white shadow-[0_10px_30px_rgba(15,23,42,0.8)]'
            : 'bg-transparent text-slate-200/80 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        Civilian
      </button>
    </div>
  );
}
