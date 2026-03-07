'use client';

import { cn } from '@/lib/utils';
import type { CityConfig } from '@/lib/map-3d/types';

interface CitySelectorProps {
  cities: CityConfig[];
  currentCity: CityConfig;
  onCityChange: (city: CityConfig) => void;
}

export default function CitySelector({ cities, currentCity, onCityChange }: CitySelectorProps) {
  return (
    <div className="map-3d-city-selector flex flex-wrap gap-2 rounded-[50px] p-1.5">
      {cities.map((city) => (
        <button
          key={city.id}
          type="button"
          onClick={() => onCityChange(city)}
          className={cn(
            'map-3d-city-btn rounded-[50px] px-5 py-2.5 text-sm font-medium transition-all duration-200',
            currentCity.id === city.id
              ? 'map-3d-city-btn--active bg-[#1a1611] text-[#f4efe6] shadow-md hover:shadow-lg'
              : 'map-3d-city-btn--inactive border border-[#e8e0d2] bg-white/90 text-[#3d362c] hover:border-[#3d362c] hover:text-[#1a1611] hover:-translate-y-0.5'
          )}
        >
          {city.name}
        </button>
      ))}
    </div>
  );
}
