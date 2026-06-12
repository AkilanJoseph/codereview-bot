import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../../db/client', () => ({
  prisma: {
    user: {
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash:    vi.fn().mockResolvedValue('hashed_pw'),
    compare: vi.fn(),
  },
  hash:    vi.fn().mockResolvedValue('hashed_pw'),
  compare: vi.fn(),
}));

import { prisma } from '../../../db/client';
import bcrypt from 'bcryptjs';
import { app } from '../../../index';

const mockedPrisma = vi.mocked(prisma);
const bcryptCompare = bcrypt.compare as unknown as MockInstance;

const SECRET = 'test_jwt_secret_at_least_32_chars!!';

beforeEach(() => {
  vi.clearAllMocks();
  process.env['JWT_SECRET'] = SECRET;
});

describe('POST /api/auth/register', () => {
  it('creates user and returns token', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue({
      id: 'user-1', email: 'alice@test.com', githubLogin: 'alice',
      role: 'DEVELOPER', passwordHash: 'hashed_pw', createdAt: new Date(),
    } as never);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('alice@test.com');
  });

  it('returns 409 when email already exists', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({ id: 'existing' } as never);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'short' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns token on valid credentials', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1', email: 'alice@test.com', githubLogin: 'alice',
      role: 'DEVELOPER', passwordHash: 'hashed_pw', createdAt: new Date(),
    } as never);
    bcryptCompare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1', email: 'alice@test.com', role: 'DEVELOPER',
      passwordHash: 'hashed_pw', createdAt: new Date(),
    } as never);
    bcryptCompare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns current user from valid token', async () => {
    const token = jwt.sign({ userId: 'user-1', email: 'alice@test.com', role: 'DEVELOPER' }, SECRET, { expiresIn: '1h' });
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'alice@test.com', githubLogin: 'alice',
      role: 'DEVELOPER', createdAt: new Date(),
    } as never);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('alice@test.com');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.valid.token');

    expect(res.status).toBe(401);
  });

  it('returns 404 when user no longer exists in database', async () => {
    const token = jwt.sign({ userId: 'gone-user', email: 'gone@test.com', role: 'DEVELOPER' }, SECRET, { expiresIn: '1h' });
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
