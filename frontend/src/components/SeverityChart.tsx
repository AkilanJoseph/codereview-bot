interface SeverityCount { severity: string; count: number }
interface SeverityChartProps { data: SeverityCount[] }

const CONFIG: Record<string, { bar: string; label: string; bg: string }> = {
  CRITICAL: { bar: 'bg-red-500',    label: 'text-red-700',    bg: 'bg-red-50'    },
  HIGH:     { bar: 'bg-orange-500', label: 'text-orange-700', bg: 'bg-orange-50' },
  MEDIUM:   { bar: 'bg-amber-500',  label: 'text-amber-700',  bg: 'bg-amber-50'  },
  LOW:      { bar: 'bg-blue-500',   label: 'text-blue-700',   bg: 'bg-blue-50'   },
  INFO:     { bar: 'bg-slate-400',  label: 'text-slate-600',  bg: 'bg-slate-50'  },
};

export function SeverityChart({ data }: SeverityChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-3">
      {data.map(({ severity, count }) => {
        const cfg = CONFIG[severity] ?? CONFIG['INFO'];
        const pct = Math.round((count / total) * 100) || 0;
        return (
          <div key={severity} className={`rounded-lg px-4 py-3 ${cfg.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.label}`}>{severity}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${cfg.label}`}>{pct}%</span>
                <span className={`text-sm font-bold ${cfg.label}`}>{count}</span>
              </div>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${cfg.bar}`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
      {total > 0 && (
        <p className="text-xs text-slate-500 text-right pt-1">{total} total open findings</p>
      )}
    </div>
  );
}
