import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../../db/client', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    repository: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from '../../../db/client';
import { app } from '../../../index';

const mockedPrisma = vi.mocked(prisma);
const SECRET = 'test_jwt_secret_at_least_32_chars!!';

function authHeader() {
  const token = jwt.sign({ userId: 'u1', email: 'test@test.com', role: 'ADMIN' }, SECRET, { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

const REPO = {
  id: 'repo-1', githubRepoId: 12345, owner: 'acme', name: 'api',
  installId: 'install-1', active: true, createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env['JWT_SECRET'] = SECRET;
});

describe('GET /api/repos', () => {
  it('returns list of repositories', async () => {
    mockedPrisma.repository.findMany.mockResolvedValue([REPO] as never);

    const res = await request(app).get('/api/repos').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.count).toBe(1);
  });

  it('filters by active=true', async () => {
    mockedPrisma.repository.findMany.mockResolvedValue([REPO] as never);

    const res = await request(app).get('/api/repos?active=true').set(authHeader());

    expect(res.status).toBe(200);
    expect(mockedPrisma.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } }),
    );
  });
});

describe('POST /api/repos', () => {
  it('creates a repository', async () => {
    mockedPrisma.repository.create.mockResolvedValue(REPO as never);

    const res = await request(app)
      .post('/api/repos')
      .set(authHeader())
      .send({ githubRepoId: 12345, owner: 'acme', name: 'api', installId: 'install-1' });

    expect(res.status).toBe(201);
    expect(res.body.data.owner).toBe('acme');
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/repos')
      .set(authHeader())
      .send({ owner: 'acme' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/repos/:repoId', () => {
  it('deactivates repository', async () => {
    mockedPrisma.repository.findUnique.mockResolvedValue(REPO as never);
    mockedPrisma.repository.update.mockResolvedValue({ ...REPO, active: false } as never);

    const res = await request(app).delete('/api/repos/repo-1').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.deactivated).toBe(true);
  });

  it('returns 404 for unknown repo', async () => {
    mockedPrisma.repository.findUnique.mockResolvedValue(null);

    const res = await request(app).delete('/api/repos/bad-id').set(authHeader());
    expect(res.status).toBe(404);
  });
});
