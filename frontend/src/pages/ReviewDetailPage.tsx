import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Review, Finding } from '../api/client';
import { FindingsBadge } from '../components/FindingsBadge';

const STATUS_CONFIG: Record<string, { cls: string; dot: string }> = {
  COMPLETE: { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  RUNNING:  { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',          dot: 'bg-blue-500 animate-pulse' },
  PENDING:  { cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',       dot: 'bg-slate-400' },
  FAILED:   { cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',             dot: 'bg-red-500' },
};

const CATEGORY_ICON: Record<string, string> = {
  SECURITY:    '🔒',
  PERFORMANCE: '⚡',
  STYLE:       '✏️',
};

export function ReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reviewId) return;
    api.reviews.get(reviewId)
      .then(setReview)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [reviewId]);

  async function suppress(findingId: string) {
    const reason = prompt('Reason for suppressing this finding:');
    if (!reason) return;
    try {
      await api.findings.suppress(findingId, reason);
      if (reviewId) setReview(await api.reviews.get(reviewId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suppress finding');
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-6 py-4">{error}</div>
  );
  if (!review) return null;

  const activeFindings = (review.findings ?? []).filter((f) => !f.suppressed);
  const suppressedCount = (review.findings ?? []).length - activeFindings.length;
  const byFile = activeFindings.reduce<Record<string, Finding[]>>((acc, f) => {
    (acc[f.filePath] ??= []).push(f);
    return acc;
  }, {});

  const sc = STATUS_CONFIG[review.status] ?? STATUS_CONFIG['PENDING'];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </Link>

      {/* PR Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sc.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {review.status}
              </span>
              <span className="text-slate-400 text-sm font-mono">PR #{review.prNumber}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{review.prTitle}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {review.prAuthor[0]?.toUpperCase()}
                </div>
                <span>{review.prAuthor}</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{review.baseBranch}</span>
              <span className="text-slate-400">←</span>
              <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{review.headBranch}</span>
              <a href={review.prUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
          {/* Finding summary */}
          <div className="flex gap-3 flex-wrap">
            <div className="text-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-2xl font-bold text-slate-800">{activeFindings.length}</div>
              <div className="text-xs text-slate-500">Active</div>
            </div>
            {suppressedCount > 0 && (
              <div className="text-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-2xl font-bold text-slate-400">{suppressedCount}</div>
                <div className="text-xs text-slate-400">Suppressed</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Findings */}
      {Object.keys(byFile).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">No active findings</p>
          <p className="text-slate-400 text-sm mt-1">This review looks clean.</p>
        </div>
      ) : (
        Object.entries(byFile).map(([filePath, fileFindings]) => (
          <div key={filePath} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-mono text-sm text-slate-200">{filePath}</span>
              <span className="ml-auto text-xs text-slate-400">{fileFindings.length} finding{fileFindings.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {fileFindings.map((finding) => (
                <div key={finding.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3 flex-wrap mb-3">
                    <FindingsBadge severity={finding.severity} />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-mono">
                      line {finding.lineStart}{finding.lineEnd && finding.lineEnd !== finding.lineStart ? `–${finding.lineEnd}` : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                      {CATEGORY_ICON[finding.category]} {finding.rule?.name ?? finding.ruleId}
                    </span>
                    <button
                      onClick={() => void suppress(finding.id)}
                      className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
                    >
                      Suppress
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{finding.message}</p>
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                    <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-sm text-blue-800">{finding.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
