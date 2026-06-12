import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Review, Finding } from '../api/client';
import { ReviewList } from '../components/ReviewList';
import { SeverityChart } from '../components/SeverityChart';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;

export function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [fetchedReviews, fetchedFindings] = await Promise.all([
        api.reviews.list({ limit: 10 }),
        api.findings.list({ suppressed: false }),
      ]);
      setReviews(fetchedReviews);
      setFindings(fetchedFindings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const severityCounts = SEVERITIES.map((s) => ({
    severity: s,
    count: findings.filter((f) => f.severity === s).length,
  }));

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const prsThisWeek = reviews.filter((r) => new Date(r.createdAt) > weekAgo).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="PRs reviewed this week" value={prsThisWeek} />
        <StatCard label="Open findings" value={findings.length} />
        <StatCard
          label="Critical findings"
          value={findings.filter((f) => f.severity === 'CRITICAL').length}
          highlight
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Open Findings by Severity</h2>
        <SeverityChart data={severityCounts} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Recent Reviews</h2>
        </div>
        <ReviewList reviews={reviews} loading={loading} />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-5 ${highlight ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className={`text-3xl font-bold ${highlight ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}
