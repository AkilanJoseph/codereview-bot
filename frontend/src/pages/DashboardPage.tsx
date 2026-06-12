import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Review, Finding } from '../api/client';
import { ReviewList } from '../components/ReviewList';
import { SeverityChart } from '../components/SeverityChart';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;

const STAT_CONFIG = [
  {
    key: 'prs',
    label: 'PRs Reviewed This Week',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    iconBg: 'bg-blue-500',
    valueCls: 'text-slate-800',
  },
  {
    key: 'findings',
    label: 'Open Findings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    iconBg: 'bg-amber-500',
    valueCls: 'text-slate-800',
  },
  {
    key: 'critical',
    label: 'Critical Findings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    iconBg: 'bg-red-500',
    valueCls: 'text-red-600',
  },
  {
    key: 'repos',
    label: 'Connected Repos',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    iconBg: 'bg-indigo-500',
    valueCls: 'text-slate-800',
  },
] as const;

export function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [repoCount, setRepoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      const [fetchedReviews, fetchedFindings, fetchedRepos] = await Promise.all([
        api.reviews.list({ limit: 20 }),
        api.findings.list({ suppressed: false }),
        api.repos.list(true),
      ]);
      setReviews(fetchedReviews);
      setFindings(fetchedFindings);
      setRepoCount(fetchedRepos.length);
      setError(null);
      setLastRefresh(new Date());
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

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const prsThisWeek = reviews.filter((r) => new Date(r.createdAt) > weekAgo).length;
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;

  const severityCounts = SEVERITIES.map((s) => ({
    severity: s,
    count: findings.filter((f) => f.severity === s).length,
  }));

  const statValues: Record<string, number> = {
    prs: prsThisWeek,
    findings: findings.length,
    critical: criticalCount,
    repos: repoCount,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Last updated {lastRefresh.toLocaleTimeString()} · auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CONFIG.map((cfg) => (
          <div key={cfg.key} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl ${cfg.iconBg} flex items-center justify-center text-white shadow-sm shrink-0`}>
              {cfg.icon}
            </div>
            <div>
              <div className={`text-2xl font-bold ${cfg.valueCls}`}>{statValues[cfg.key] ?? 0}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-tight">{cfg.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Open Findings by Severity
          </h2>
          <SeverityChart data={severityCounts} />
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Recent Reviews
            </h2>
            <span className="text-xs text-slate-400">{reviews.length} total</span>
          </div>
          <ReviewList reviews={reviews} loading={loading} />
        </div>
      </div>
    </div>
  );
}
