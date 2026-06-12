import { useNavigate } from 'react-router-dom';
import { FindingsBadge } from './FindingsBadge';
import type { Review } from '../api/client';

interface ReviewListProps {
  reviews: Review[];
  loading?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETE: 'bg-green-100 text-green-800',
  RUNNING: 'bg-blue-100 text-blue-800 animate-pulse',
  PENDING: 'bg-gray-100 text-gray-700',
  FAILED: 'bg-red-100 text-red-800',
};

export function ReviewList({ reviews, loading }: ReviewListProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading reviews…</div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No reviews yet. Connect a repository and open a PR to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">PR</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Repository</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Author</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Findings</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {reviews.map((review) => (
            <tr
              key={review.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => navigate(`/reviews/${review.id}`)}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">#{review.prNumber}</div>
                <div className="text-gray-500 truncate max-w-xs">{review.prTitle}</div>
              </td>
              <td className="px-4 py-3 text-gray-700">
                {review.repository ? `${review.repository.owner}/${review.repository.name}` : '—'}
              </td>
              <td className="px-4 py-3 text-gray-700">{review.prAuthor}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${STATUS_STYLES[review.status] ?? ''}`}>
                  {review.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {review._count !== undefined ? (
                  <span className="text-gray-700">{review._count.findings}</span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(review.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { Review };
export { FindingsBadge };
