import { useNavigate } from 'react-router-dom';
import { FindingsBadge } from './FindingsBadge';
import type { Review } from '../api/client';

interface ReviewListProps {
  reviews: Review[];
  loading?: boolean;
}

const STATUS_CONFIG: Record<string, { cls: string; dot: string; label: string }> = {
  COMPLETE: { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500', label: 'Complete' },
  RUNNING:  { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',          dot: 'bg-blue-500 animate-pulse', label: 'Running' },
  PENDING:  { cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',       dot: 'bg-slate-400', label: 'Pending' },
  FAILED:   { cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',             dot: 'bg-red-500', label: 'Failed' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['PENDING'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function ReviewList({ reviews, loading }: ReviewListProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="divide-y divide-slate-100">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-6 py-4 animate-pulse flex gap-4 items-center">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
            <div className="h-6 w-20 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm">No reviews yet. Connect a repository and open a PR to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {['PR', 'Repository', 'Author', 'Status', 'Findings', 'Date'].map((h) => (
              <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {reviews.map((review) => (
            <tr
              key={review.id}
              className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
              onClick={() => navigate(`/reviews/${review.id}`)}
            >
              <td className="px-6 py-4">
                <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                  #{review.prNumber}
                </div>
                <div className="text-slate-500 text-xs mt-0.5 truncate max-w-[240px]">{review.prTitle}</div>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  {review.repository ? `${review.repository.owner}/${review.repository.name}` : '—'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {review.prAuthor[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-600">{review.prAuthor}</span>
                </div>
              </td>
              <td className="px-6 py-4"><StatusBadge status={review.status} /></td>
              <td className="px-6 py-4">
                {review._count !== undefined ? (
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${review._count.findings > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                    {review._count.findings}
                  </span>
                ) : '—'}
              </td>
              <td className="px-6 py-4 text-sm text-slate-500">
                {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
