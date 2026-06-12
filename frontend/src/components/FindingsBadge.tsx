interface FindingsBadgeProps {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  className?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  LOW: 'bg-blue-100 text-blue-800 border border-blue-300',
  INFO: 'bg-gray-100 text-gray-700 border border-gray-300',
};

export function FindingsBadge({ severity, className = '' }: FindingsBadgeProps) {
  const styles = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES['INFO'];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${styles} ${className}`}
    >
      {severity}
    </span>
  );
}
