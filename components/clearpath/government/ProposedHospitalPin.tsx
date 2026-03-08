'use client';

interface ProposedHospitalPinProps {
  lat: number;
  lng: number;
}

export default function ProposedHospitalPin({ lat, lng }: ProposedHospitalPinProps) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="w-3 h-3 rounded-full bg-blue-600 shadow-md animate-pulse" />
      <div className="text-xs">
        <span className="font-bold text-blue-800">Proposed ER</span>
        <span className="text-slate-400 ml-2 font-mono text-[10px]">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
