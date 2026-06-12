import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../../db/client', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    finding: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
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

const FINDING = {
  id: 'f-1', filePath: 'src/db.ts', lineStart: 10, lineEnd: 10,
  category: 'SECURITY', severity: 'CRITICAL', ruleId: 'rule-1',
  message: 'SQL injection risk', suggestion: 'Use parameterized queries',
  suppressed: false, createdAt: new Date(), reviewId: 'rev-1',
  rule: { id: 'rule-1', name: 'SQL Injection' },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env['JWT_SECRET'] = SECRET;
});

describe('GET /api/findings', () => {
  it('lists findings', async () => {
    mockedPrisma.finding.findMany.mockResolvedValue([FINDING] as never);

    const res = await request(app).get('/api/findings').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.count).toBe(1);
  });

  it('filters by severity', async () => {
    mockedPrisma.finding.findMany.mockResolvedValue([FINDING] as never);

    const res = await request(app).get('/api/findings?severity=CRITICAL').set(authHeader());

    expect(res.status).toBe(200);
    expect(mockedPrisma.finding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ severity: 'CRITICAL' }) }),
    );
  });

  it('filters by reviewId', async () => {
    mockedPrisma.finding.findMany.mockResolvedValue([FINDING] as never);

    const res = await request(app).get('/api/findings?reviewId=rev-1').set(authHeader());

    expect(res.status).toBe(200);
    expect(mockedPrisma.finding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ reviewId: 'rev-1' }) }),
    );
  });

  it('returns 400 for invalid severity', async () => {
    const res = await request(app).get('/api/findings?severity=INVALID').set(authHeader());
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/findings/:findingId/suppress', () => {
  it('suppresses a finding', async () => {
    mockedPrisma.finding.findUnique.mockResolvedValue(FINDING as never);
    mockedPrisma.finding.update.mockResolvedValue({ ...FINDING, suppressed: true } as never);

    const res = await request(app)
      .patch('/api/findings/f-1/suppress')
      .set(authHeader())
      .send({ reason: 'Accepted risk' });

    expect(res.status).toBe(200);
    expect(res.body.data.suppressed).toBe(true);
  });

  it('returns 404 for unknown finding', async () => {
    mockedPrisma.finding.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/findings/bad-id/suppress')
      .set(authHeader())
      .send({ reason: 'test' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when reason is missing', async () => {
    mockedPrisma.finding.findUnique.mockResolvedValue(FINDING as never);

    const res = await request(app)
      .patch('/api/findings/f-1/suppress')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(400);
  });
});
