'use client';

interface HospitalMarkerProps {
  name: string;
  occupancyPct: number;
  waitMinutes: number;
  isRecommended?: boolean;
}

function getColor(pct: number): string {
  if (pct <= 50) return '#22c55e';
  if (pct <= 75) return '#eab308';
  if (pct <= 90) return '#f97316';
  return '#dc2626';
}

export default function HospitalMarker({ name, occupancyPct, waitMinutes, isRecommended }: HospitalMarkerProps) {
  const color = getColor(occupancyPct);

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative rounded-full flex items-center justify-center ${isRecommended ? 'animate-bounce' : ''}`}
        style={{
          width: 40,
          height: 40,
          backgroundColor: color,
          boxShadow: `0 1px 4px ${color}80`,
        }}
      >
        <span className="text-white text-xs font-bold">{Math.round(occupancyPct)}%</span>
      </div>
      <div className="mt-1 px-2 py-0.5 bg-white/90 backdrop-blur rounded shadow text-[10px] font-semibold text-slate-800 whitespace-nowrap font-readable">
        {name}
      </div>
      <div className="text-[9px] text-slate-500 font-medium">
        ~{waitMinutes} min wait
      </div>
    </div>
  );
}
