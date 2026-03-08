'use client';

import { PRESET_BLUEPRINTS, type Blueprint } from '@/lib/clearpath/blueprints';

interface BlueprintPickerProps {
  selected: Blueprint | null;
  onSelect: (blueprint: Blueprint) => void;
}

export default function BlueprintPicker({ selected, onSelect }: BlueprintPickerProps) {
  return (
    <div className="space-y-2">
      {PRESET_BLUEPRINTS.map((bp) => {
        const isActive = selected?.id === bp.id;
        return (
          <button
            key={bp.id}
            onClick={() => onSelect(bp)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${isActive
                ? 'border-sky-400 bg-sky-500 text-white shadow-md'
                : 'border-sky-200/70 bg-white hover:border-sky-300 hover:bg-sky-50/50 text-slate-700'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-700'}`}>
                {bp.name}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-sky-600 text-sky-100' : 'bg-sky-50 text-sky-600'
                }`}>
                {bp.beds} beds
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 ${isActive ? 'text-sky-100' : 'text-slate-400'}`}>
              {bp.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
