import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Rule } from '../api/client';
import { FindingsBadge } from '../components/FindingsBadge';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const CATEGORIES = ['SECURITY', 'PERFORMANCE', 'STYLE'] as const;

type Category = (typeof CATEGORIES)[number];
type Severity = (typeof SEVERITIES)[number];

export function ConfigurationPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.rules.list()
      .then(setRules)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load rules'))
      .finally(() => setLoading(false));
  }, []);

  async function toggleRule(rule: Rule) {
    setSaving(rule.id);
    try {
      const updated = await api.rules.update(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setSaving(null);
    }
  }

  async function changeSeverity(rule: Rule, severity: Severity) {
    setSaving(rule.id);
    try {
      const updated = await api.rules.update(rule.id, { severity });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-500">Loading rules…</div>;

  const byCategory = CATEGORIES.reduce<Record<Category, Rule[]>>(
    (acc, cat) => { acc[cat] = rules.filter((r) => r.category === cat); return acc; },
    { SECURITY: [], PERFORMANCE: [], STYLE: [] },
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Rule Configuration</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {CATEGORIES.map((cat) => (
        <div key={cat} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-700">{cat}</h2>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-6 py-3">Rule</th>
                <th className="px-6 py-3">Default Severity</th>
                <th className="px-6 py-3">Enabled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {byCategory[cat].map((rule) => (
                <tr key={rule.id} className={saving === rule.id ? 'opacity-50' : ''}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{rule.name}</div>
                    <div className="text-gray-500 text-xs">{rule.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={rule.defaultSeverity}
                      onChange={(e) => void changeSeverity(rule, e.target.value as Severity)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      disabled={saving === rule.id}
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => void toggleRule(rule)}
                      disabled={saving === rule.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rule.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export { FindingsBadge };
