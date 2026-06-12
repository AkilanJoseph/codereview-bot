import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../authMiddleware';

const SECRET = 'test_jwt_secret_at_least_32_chars!!';

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeRes(): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; locals: Record<string, unknown> } {
  const locals: Record<string, unknown> = {};
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json, locals } as unknown as Response, status, json, locals };
}

beforeEach(() => {
  process.env['JWT_SECRET'] = SECRET;
});

describe('requireAuth', () => {
  it('returns 401 when Authorization header is missing', () => {
    const { res, status } = makeRes();
    const next = vi.fn();

    requireAuth(makeReq(), res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', () => {
    const { res, status } = makeRes();
    const next = vi.fn();

    requireAuth(makeReq({ authorization: 'Basic abc123' }), res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when JWT_SECRET is not configured', () => {
    delete process.env['JWT_SECRET'];
    const { res, status } = makeRes();
    const next = vi.fn();

    requireAuth(makeReq({ authorization: 'Bearer sometoken' }), res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    const { res, status } = makeRes();
    const next = vi.fn();

    requireAuth(makeReq({ authorization: 'Bearer not.a.valid.jwt' }), res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', () => {
    const token = jwt.sign({ userId: 'u1', email: 'a@b.com', role: 'DEVELOPER' }, SECRET, { expiresIn: -1 });
    const { res, status } = makeRes();
    const next = vi.fn();

    requireAuth(makeReq({ authorization: `Bearer ${token}` }), res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets res.locals.user on valid token', () => {
    const token = jwt.sign({ userId: 'u1', email: 'a@b.com', role: 'ADMIN' }, SECRET, { expiresIn: '1h' });
    const { res, locals } = makeRes();
    const next = vi.fn();

    requireAuth(makeReq({ authorization: `Bearer ${token}` }), res, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(locals['user']).toMatchObject({ userId: 'u1', role: 'ADMIN' });
  });
});
