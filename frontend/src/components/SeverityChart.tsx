interface SeverityCount {
  severity: string;
  count: number;
}

interface SeverityChartProps {
  data: SeverityCount[];
}

const COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-gray-400',
};

export function SeverityChart({ data }: SeverityChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      {data.map(({ severity, count }) => (
        <div key={severity} className="flex items-center gap-3">
          <span className="w-20 text-xs font-semibold text-gray-600 uppercase">{severity}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${COLORS[severity] ?? 'bg-gray-400'}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right text-sm font-medium text-gray-700">{count}</span>
        </div>
      ))}
    </div>
  );
}
