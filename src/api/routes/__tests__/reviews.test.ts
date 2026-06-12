import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../../db/client', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    review: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
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

const REVIEW = {
  id: 'rev-1', prNumber: 42, prTitle: 'feat: auth', prAuthor: 'alice',
  prUrl: 'https://github.com/org/repo/pull/42', baseBranch: 'main', headBranch: 'feat/auth',
  status: 'COMPLETE', startedAt: null, completedAt: null, createdAt: new Date(),
  repositoryId: 'repo-1', repository: { id: 'repo-1', owner: 'org', name: 'repo' },
  _count: { findings: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env['JWT_SECRET'] = SECRET;
});

describe('GET /api/reviews', () => {
  it('returns paginated reviews', async () => {
    mockedPrisma.review.findMany.mockResolvedValue([REVIEW] as never);
    mockedPrisma.review.count.mockResolvedValue(1);

    const res = await request(app).get('/api/reviews').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('filters by status', async () => {
    mockedPrisma.review.findMany.mockResolvedValue([]);
    mockedPrisma.review.count.mockResolvedValue(0);

    const res = await request(app).get('/api/reviews?status=COMPLETE').set(authHeader());

    expect(res.status).toBe(200);
    expect(mockedPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'COMPLETE' }) }),
    );
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app).get('/api/reviews?status=INVALID').set(authHeader());
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/reviews');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/reviews/:reviewId', () => {
  it('returns review with findings', async () => {
    mockedPrisma.review.findUnique.mockResolvedValue({ ...REVIEW, findings: [] } as never);

    const res = await request(app).get('/api/reviews/rev-1').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('rev-1');
  });

  it('returns 404 for unknown review', async () => {
    mockedPrisma.review.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/reviews/bad-id').set(authHeader());
    expect(res.status).toBe(404);
  });
});
