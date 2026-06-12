import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../../db/client', () => ({
  prisma: {
    user: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
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

const USER = {
  id: 'u-1', githubLogin: 'alice', email: 'alice@test.com',
  role: 'DEVELOPER', createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env['JWT_SECRET'] = SECRET;
});

describe('GET /api/users', () => {
  it('returns list of users', async () => {
    mockedPrisma.user.findMany.mockResolvedValue([USER] as never);

    const res = await request(app).get('/api/users').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.count).toBe(1);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/users/invite', () => {
  it('accepts valid invite request', async () => {
    const res = await request(app)
      .post('/api/users/invite')
      .set(authHeader())
      .send({ email: 'bob@test.com', role: 'DEVELOPER' });

    expect(res.status).toBe(202);
    expect(res.body.data.invited).toBe(true);
    expect(res.body.data.email).toBe('bob@test.com');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users/invite')
      .set(authHeader())
      .send({ email: 'not-an-email', role: 'DEVELOPER' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const res = await request(app)
      .post('/api/users/invite')
      .set(authHeader())
      .send({ email: 'bob@test.com', role: 'SUPERUSER' });

    expect(res.status).toBe(400);
  });
});
