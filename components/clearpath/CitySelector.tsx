'use client';

import type { CityConfig } from '@/lib/map-3d/types';

interface CitySelectorProps {
  cities: CityConfig[];
  currentCityId: string;
  onCityChange: (city: CityConfig) => void;
}

export default function CitySelector({ cities, currentCityId, onCityChange }: CitySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-[50px] p-1.5 bg-white/90 backdrop-blur border border-white/20 shadow">
      {cities.map((city) => {
        const isActive = city.id === currentCityId;
        return (
          <button
            key={city.id}
            type="button"
            onClick={() => onCityChange(city)}
            className={`rounded-[50px] px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {city.name}
          </button>
        );
      })}
    </div>
  );
}
