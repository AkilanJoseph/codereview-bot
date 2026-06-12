import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../../services/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { errorHandler } from '../errorHandler';

function makeReq(): Request {
  return {} as Request;
}

function makeRes(): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Response, status, json };
}

const next: NextFunction = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  process.env['NODE_ENV'] = 'test';
});

describe('errorHandler', () => {
  it('returns 503 for Prisma initialization errors', () => {
    const { res, status, json } = makeRes();
    const err = new Error('DB connection failed');
    err.constructor = { name: 'PrismaClientInitializationError' } as unknown as Function;
    Object.defineProperty(err, 'constructor', { value: { name: 'PrismaClientInitializationError' } });

    errorHandler(err, makeReq(), res, next);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'DATABASE_UNAVAILABLE' }),
    }));
  });

  it('returns 503 for errors with Prisma message pattern', () => {
    const { res, status } = makeRes();
    const err = new Error('Invalid `prisma.user.findFirst()` invocation');

    errorHandler(err, makeReq(), res, next);

    expect(status).toHaveBeenCalledWith(503);
  });

  it('returns the error statusCode when set', () => {
    const { res, status, json } = makeRes();
    const err = Object.assign(new Error('Not allowed'), { statusCode: 403, code: 'FORBIDDEN' });

    errorHandler(err, makeReq(), res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'FORBIDDEN' }),
    }));
  });

  it('hides the message in production for 500 errors', () => {
    process.env['NODE_ENV'] = 'production';
    const { res, json } = makeRes();
    const err = new Error('Sensitive internal detail');

    errorHandler(err, makeReq(), res, next);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ message: 'An internal error occurred' }),
    }));
  });

  it('exposes message in non-production for 500 errors', () => {
    process.env['NODE_ENV'] = 'development';
    const { res, json } = makeRes();
    const err = new Error('Detailed error message');

    errorHandler(err, makeReq(), res, next);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ message: 'Detailed error message' }),
    }));
  });

  it('defaults to 500 and INTERNAL_ERROR when no statusCode/code set', () => {
    const { res, status, json } = makeRes();
    const err = new Error('Something went wrong');

    errorHandler(err, makeReq(), res, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
    }));
  });
});
