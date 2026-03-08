'use client';

interface SimulationResultPanelProps {
  result: {
    before: Record<string, number>;
    after: Record<string, number>;
    delta: Record<string, number>;
    proposedAfter?: Record<string, number>;
  };
  hospitals: any[];
  proposedLabels?: Record<string, string>;
}

export default function SimulationResultPanel({ result, hospitals, proposedLabels = {} }: SimulationResultPanelProps) {
  const hospitalMap: Record<string, string> = {};
  for (const h of hospitals) {
    hospitalMap[(h._id ?? h.id)?.toString()] = h.name;
  }

  const rows = Object.keys(result.before).map((id) => ({
    id,
    name: hospitalMap[id] ?? id,
    before: result.before[id],
    after: result.after[id],
    delta: result.delta[id],
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          Simulation Results
        </h3>
      </div>
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase tracking-wide">Hospital</th>
              <th className="text-right px-2 py-2 font-bold text-slate-500 uppercase tracking-wide">Before</th>
              <th className="text-right px-2 py-2 font-bold text-slate-500 uppercase tracking-wide">After</th>
              <th className="text-right px-3 py-2 font-bold text-slate-500 uppercase tracking-wide">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 font-medium text-slate-700 truncate max-w-[120px]">{row.name}</td>
                <td className="text-right px-2 py-2 text-slate-500 font-mono">{parseFloat(row.before.toFixed(1))}%</td>
                <td className="text-right px-2 py-2 text-slate-600 font-mono">{parseFloat(row.after.toFixed(1))}%</td>
                <td className={`text-right px-3 py-2 font-bold font-mono ${row.delta < 0 ? 'text-green-600' : row.delta > 0 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                  {row.delta > 0 ? '+' : ''}{parseFloat(row.delta.toFixed(1))}%
                </td>
              </tr>
            ))}
            {(() => {
              const proposed = result.proposedAfter ?? (result.after?.['proposed'] !== undefined ? { proposed: result.after['proposed'] } : {});
              return Object.entries(proposed).map(([key, occ]) => (
                <tr key={key} className="bg-blue-50/70 border-t border-blue-200">
                  <td className="px-3 py-2 font-bold text-blue-800">{proposedLabels[key] ?? `Proposed ${key.replace('proposed-', '#')}`}</td>
                  <td className="text-right px-2 py-2 text-slate-400">—</td>
                  <td className="text-right px-2 py-2 font-bold text-blue-700 font-mono">{occ}%</td>
                  <td className="text-right px-3 py-2">
                    <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold uppercase tracking-wide">New</span>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
