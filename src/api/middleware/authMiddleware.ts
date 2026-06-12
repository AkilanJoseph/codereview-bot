import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Locals {
      user: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ data: null, meta: null, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    return;
  }
  const token = header.slice(7);
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    res.status(500).json({ data: null, meta: null, error: { code: 'SERVER_ERROR', message: 'JWT_SECRET not configured' } });
    return;
  }
  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    res.locals['user'] = payload;
    next();
  } catch {
    res.status(401).json({ data: null, meta: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}
