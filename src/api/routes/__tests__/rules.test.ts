import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../../db/client', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    rule: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
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

const RULE = {
  id: 'rule-1', slug: 'sql-injection', name: 'SQL Injection',
  description: 'Detects SQL injection', category: 'SECURITY',
  defaultSeverity: 'CRITICAL', enabled: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env['JWT_SECRET'] = SECRET;
});

describe('GET /api/rules', () => {
  it('returns all rules', async () => {
    mockedPrisma.rule.findMany.mockResolvedValue([RULE] as never);

    const res = await request(app).get('/api/rules').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.count).toBe(1);
  });
});

describe('PATCH /api/rules/:ruleId', () => {
  it('toggles a rule disabled', async () => {
    mockedPrisma.rule.findUnique.mockResolvedValue(RULE as never);
    mockedPrisma.rule.update.mockResolvedValue({ ...RULE, enabled: false } as never);

    const res = await request(app)
      .patch('/api/rules/rule-1')
      .set(authHeader())
      .send({ enabled: false });

    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
  });

  it('updates default severity', async () => {
    mockedPrisma.rule.findUnique.mockResolvedValue(RULE as never);
    mockedPrisma.rule.update.mockResolvedValue({ ...RULE, defaultSeverity: 'HIGH' } as never);

    const res = await request(app)
      .patch('/api/rules/rule-1')
      .set(authHeader())
      .send({ severity: 'HIGH' });

    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown rule', async () => {
    mockedPrisma.rule.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/rules/bad-id')
      .set(authHeader())
      .send({ enabled: false });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid severity', async () => {
    mockedPrisma.rule.findUnique.mockResolvedValue(RULE as never);

    const res = await request(app)
      .patch('/api/rules/rule-1')
      .set(authHeader())
      .send({ severity: 'EXTREME' });

    expect(res.status).toBe(400);
  });
});
