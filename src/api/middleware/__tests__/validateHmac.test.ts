import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { validateHmac } from '../validateHmac';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: Buffer.from('{}'),
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Response, status, json };
}

function validSig(body: Buffer, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

const SECRET = 'test-webhook-secret';

beforeEach(() => {
  process.env['GITHUB_WEBHOOK_SECRET'] = SECRET;
});

describe('validateHmac', () => {
  it('returns 500 when GITHUB_WEBHOOK_SECRET is not set', () => {
    delete process.env['GITHUB_WEBHOOK_SECRET'];
    const { res, status } = makeRes();
    const next = vi.fn();

    validateHmac(makeReq(), res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when X-Hub-Signature-256 header is missing', () => {
    const { res, status } = makeRes();
    const next = vi.fn();

    validateHmac(makeReq({ headers: {} }), res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when X-Hub-Signature-256 is an array (not a string)', () => {
    const { res, status } = makeRes();
    const next = vi.fn();

    validateHmac(
      makeReq({ headers: { 'x-hub-signature-256': ['sig1', 'sig2'] as unknown as string } }),
      res,
      next as NextFunction,
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when signature is wrong', () => {
    const body = Buffer.from('{"action":"opened"}');
    const { res, status } = makeRes();
    const next = vi.fn();

    validateHmac(
      makeReq({ headers: { 'x-hub-signature-256': 'sha256=wrongsignature' }, body }),
      res,
      next as NextFunction,
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when signature is valid', () => {
    const body = Buffer.from('{"action":"opened"}');
    const sig = validSig(body, SECRET);
    const next = vi.fn();
    const { res } = makeRes();

    validateHmac(
      makeReq({ headers: { 'x-hub-signature-256': sig }, body }),
      res,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401 for a valid-format signature with wrong secret', () => {
    const body = Buffer.from('{"action":"opened"}');
    const sig = validSig(body, 'different-secret');
    const next = vi.fn();
    const { res, status } = makeRes();

    validateHmac(
      makeReq({ headers: { 'x-hub-signature-256': sig }, body }),
      res,
      next as NextFunction,
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
