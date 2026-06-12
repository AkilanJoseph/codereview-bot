import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Review, Finding } from '../api/client';
import { FindingsBadge } from '../components/FindingsBadge';

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
      if (reviewId) {
        const updated = await api.reviews.get(reviewId);
        setReview(updated);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suppress finding');
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-500">Loading…</div>;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!review) return null;

  // Group active findings by file
  const activeFindings = (review.findings ?? []).filter((f) => !f.suppressed);
  const byFile = activeFindings.reduce<Record<string, Finding[]>>((acc, f) => {
    (acc[f.filePath] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← Back to dashboard</Link>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              PR #{review.prNumber}: {review.prTitle}
            </h1>
            <div className="text-sm text-gray-500 mt-1">
              by <span className="font-medium">{review.prAuthor}</span>
              {' · '}
              <a href={review.prUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                View on GitHub
              </a>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {review.baseBranch} ← {review.headBranch}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyle(review.status)}`}>
            {review.status}
          </span>
        </div>
      </div>

      {Object.keys(byFile).length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
          No active findings for this review.
        </div>
      ) : (
        Object.entries(byFile).map(([filePath, fileFindings]) => (
          <div key={filePath} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-mono text-sm text-gray-700">
              {filePath}
            </div>
            <div className="divide-y divide-gray-100">
              {fileFindings.map((finding) => (
                <div key={finding.id} className="p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <FindingsBadge severity={finding.severity} />
                    <span className="text-xs text-gray-500 font-mono">
                      line {finding.lineStart}{finding.lineEnd && finding.lineEnd !== finding.lineStart ? `–${finding.lineEnd}` : ''}
                    </span>
                    <span className="text-xs text-gray-400">{finding.rule?.name ?? finding.ruleId}</span>
                  </div>
                  <p className="text-sm text-gray-800">{finding.message}</p>
                  <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                    <span className="font-semibold text-blue-700">Fix: </span>
                    {finding.suggestion}
                  </p>
                  <div className="text-right">
                    <button
                      onClick={() => void suppress(finding.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Suppress
                    </button>
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

function statusStyle(status: string): string {
  const map: Record<string, string> = {
    COMPLETE: 'bg-green-100 text-green-800',
    RUNNING: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-gray-100 text-gray-700',
    FAILED: 'bg-red-100 text-red-800',
  };
  return map[status] ?? '';
}
