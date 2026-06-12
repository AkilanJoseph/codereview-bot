import type { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

export function validateHmac(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env['GITHUB_WEBHOOK_SECRET'];

  if (!secret) {
    res.status(500).json({ data: null, meta: null, error: { code: 'CONFIG_ERROR', message: 'Webhook secret not configured' } });
    return;
  }

  if (!signature || typeof signature !== 'string') {
    res.status(401).json({ data: null, meta: null, error: { code: 'MISSING_SIGNATURE', message: 'X-Hub-Signature-256 header required' } });
    return;
  }

  // req.body is the raw Buffer when using express.raw()
  const rawBody = req.body as Buffer;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      res.status(401).json({ data: null, meta: null, error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' } });
      return;
    }
  } catch {
    res.status(401).json({ data: null, meta: null, error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' } });
    return;
  }

  next();
}
