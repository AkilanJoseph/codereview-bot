interface FindingsBadgeProps {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  className?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 ring-1 ring-red-300',
  HIGH:     'bg-orange-100 text-orange-700 ring-1 ring-orange-300',
  MEDIUM:   'bg-amber-100 text-amber-700 ring-1 ring-amber-300',
  LOW:      'bg-blue-100 text-blue-700 ring-1 ring-blue-300',
  INFO:     'bg-slate-100 text-slate-600 ring-1 ring-slate-300',
};

const SEVERITY_DOTS: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-amber-500',
  LOW:      'bg-blue-500',
  INFO:     'bg-slate-400',
};

export function FindingsBadge({ severity, className = '' }: FindingsBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${SEVERITY_STYLES[severity] ?? SEVERITY_STYLES['INFO']} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOTS[severity] ?? 'bg-slate-400'}`} />
      {severity}
    </span>
  );
}
