import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Rule } from '../api/client';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const CATEGORIES = ['SECURITY', 'PERFORMANCE', 'STYLE'] as const;
type Category = (typeof CATEGORIES)[number];
type Severity = (typeof SEVERITIES)[number];

const CATEGORY_CONFIG: Record<Category, { icon: string; color: string; bg: string }> = {
  SECURITY:    { icon: '🔒', color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  PERFORMANCE: { icon: '⚡', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  STYLE:       { icon: '✏️', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-600',
  HIGH:     'text-orange-600',
  MEDIUM:   'text-amber-600',
  LOW:      'text-blue-600',
  INFO:     'text-slate-500',
};

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
      setRules((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally { setSaving(null); }
  }

  async function changeSeverity(rule: Rule, severity: Severity) {
    setSaving(rule.id);
    try {
      const updated = await api.rules.update(rule.id, { severity });
      setRules((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally { setSaving(null); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const byCategory = CATEGORIES.reduce<Record<Category, Rule[]>>(
    (acc, cat) => { acc[cat] = rules.filter((r) => r.category === cat); return acc; },
    { SECURITY: [], PERFORMANCE: [], STYLE: [] },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rule Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Enable or disable scanner rules and adjust their default severity.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {CATEGORIES.map((cat) => {
        const cfg = CATEGORY_CONFIG[cat];
        return (
          <div key={cat} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`px-6 py-3 border-b flex items-center gap-2 ${cfg.bg}`}>
              <span className="text-lg">{cfg.icon}</span>
              <h2 className={`font-semibold text-sm uppercase tracking-wider ${cfg.color}`}>{cat}</h2>
              <span className="ml-auto text-xs text-slate-400">{byCategory[cat].length} rules</span>
            </div>
            <div className="divide-y divide-slate-100">
              {byCategory[cat].length === 0 ? (
                <p className="px-6 py-4 text-sm text-slate-400">No rules in this category.</p>
              ) : byCategory[cat].map((rule) => (
                <div key={rule.id} className={`px-6 py-4 flex items-center gap-4 transition-opacity ${saving === rule.id ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm">{rule.name}</span>
                      {!rule.enabled && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-xs">disabled</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>
                  </div>
                  <select
                    value={rule.defaultSeverity}
                    onChange={(e) => void changeSeverity(rule, e.target.value as Severity)}
                    disabled={saving === rule.id}
                    className={`border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${SEVERITY_COLORS[rule.defaultSeverity] ?? ''}`}
                  >
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => void toggleRule(rule)}
                    disabled={saving === rule.id}
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${rule.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${rule.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
