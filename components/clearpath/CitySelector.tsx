'use client';

import type { CityConfig } from '@/lib/map-3d/types';

interface CitySelectorProps {
  cities: CityConfig[];
  currentCityId: string;
  onCityChange: (city: CityConfig) => void;
}

export default function CitySelector({ cities, currentCityId, onCityChange }: CitySelectorProps) {
  return (
    <div className="w-full rounded-[999px] bg-slate-900/85 backdrop-blur-xl border border-white/15 shadow-[0_18px_50px_rgba(15,23,42,0.8)] px-3 py-2.5 flex items-center gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800">
          <span className="text-[11px] font-semibold text-slate-100">ON</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-100">
            Choose location
          </span>
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-100">
            for care
          </span>
        </div>
      </div>
      <div className="relative flex-1 min-w-0">
        <select
          value={currentCityId}
          onChange={(e) => {
            const city = cities.find((c) => c.id === e.target.value);
            if (city) onCityChange(city);
          }}
          className="w-full appearance-none bg-white/95 text-[13px] text-slate-900 rounded-full px-4 py-2 pr-9 border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
        >
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            className="h-4 w-4 text-slate-400"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 8L10 13L15 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
