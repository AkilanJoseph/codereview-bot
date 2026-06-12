import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Repository, User } from '../api/client';

const ROLES = ['ADMIN', 'DEVELOPER', 'VIEWER'] as const;
type Role = (typeof ROLES)[number];

export function TeamManagementPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('DEVELOPER');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    Promise.all([api.repos.list(), api.users.list()])
      .then(([r, u]) => { setRepos(r); setUsers(u); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  async function toggleRepo(repo: Repository) {
    try {
      if (repo.active) {
        await api.repos.deactivate(repo.id);
      }
      setRepos((prev) => prev.map((r) => r.id === repo.id ? { ...r, active: !r.active } : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update repository');
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setInviteSuccess(false);
    try {
      await api.users.invite(inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-500">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Team & Repositories</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {/* Repositories */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Connected Repositories</h2>
        </div>
        {repos.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">No repositories connected.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Repository</th>
                <th className="px-6 py-3 text-left">Install ID</th>
                <th className="px-6 py-3 text-left">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {repos.map((repo) => (
                <tr key={repo.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {repo.owner}/{repo.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{repo.installId}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => void toggleRepo(repo)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${repo.active ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${repo.active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Team Members */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Team Members</h2>
        </div>
        {users.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">No team members yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">GitHub Login</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{user.githubLogin}</td>
                  <td className="px-6 py-4 text-gray-500">{user.email ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-semibold uppercase">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Invite Team Member</h2>
        {inviteSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            Invitation sent successfully.
          </div>
        )}
        <form onSubmit={(e) => void sendInvite(e)} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="dev@example.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}
