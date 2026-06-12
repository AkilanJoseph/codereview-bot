const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';

interface ApiResponse<T> {
  data: T;
  meta: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (body.error) throw new Error(body.error.message);
  return body.data;
}

export interface Repository {
  id: string;
  githubRepoId: number;
  owner: string;
  name: string;
  installId: string;
  active: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  prUrl: string;
  baseBranch: string;
  headBranch: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  repositoryId: string;
  repository?: Repository;
  findings?: Finding[];
  _count?: { findings: number };
}

export interface Finding {
  id: string;
  filePath: string;
  lineStart: number;
  lineEnd: number | null;
  category: 'SECURITY' | 'PERFORMANCE' | 'STYLE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  ruleId: string;
  message: string;
  suggestion: string;
  suppressed: boolean;
  createdAt: string;
  reviewId: string;
  rule?: Rule;
}

export interface Rule {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: 'SECURITY' | 'PERFORMANCE' | 'STYLE';
  defaultSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  enabled: boolean;
}

export interface User {
  id: string;
  githubLogin: string;
  email: string | null;
  role: 'ADMIN' | 'DEVELOPER' | 'VIEWER';
  createdAt: string;
}

export const api = {
  repos: {
    list: (active?: boolean) =>
      request<Repository[]>(`/api/repos${active !== undefined ? `?active=${active}` : ''}`),
    create: (body: { githubRepoId: number; owner: string; name: string; installId: string }) =>
      request<Repository>('/api/repos', { method: 'POST', body: JSON.stringify(body) }),
    deactivate: (repoId: string) =>
      request<{ deactivated: boolean }>(`/api/repos/${repoId}`, { method: 'DELETE' }),
  },
  reviews: {
    list: (params?: { repoId?: string; status?: string; page?: number; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<Review[]>(`/api/reviews${qs ? `?${qs}` : ''}`);
    },
    get: (reviewId: string) => request<Review>(`/api/reviews/${reviewId}`),
  },
  findings: {
    list: (params?: { reviewId?: string; severity?: string; category?: string; suppressed?: boolean }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<Finding[]>(`/api/findings${qs ? `?${qs}` : ''}`);
    },
    suppress: (findingId: string, reason: string) =>
      request<Finding>(`/api/findings/${findingId}/suppress`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }),
  },
  rules: {
    list: () => request<Rule[]>('/api/rules'),
    update: (ruleId: string, body: { enabled?: boolean; severity?: string }) =>
      request<Rule>(`/api/rules/${ruleId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  users: {
    list: () => request<User[]>('/api/users'),
    invite: (email: string, role: string) =>
      request<{ invited: boolean; email: string }>('/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),
  },
};
