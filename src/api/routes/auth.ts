import { Router } from 'express';
import { z } from 'zod/v4';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/client';

const router = Router();

const RegisterSchema = z.object({
  email:       z.string().email(),
  password:    z.string().min(8),
  githubLogin: z.string().min(1).optional(),
  role:        z.enum(['ADMIN', 'DEVELOPER', 'VIEWER']).optional(),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function signToken(payload: { userId: string; email: string; role: string }): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, meta: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { email, password, githubLogin, role } = parsed.data;

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      res.status(409).json({ data: null, meta: null, error: { code: 'CONFLICT', message: 'Email already registered' } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        githubLogin: githubLogin ?? email.split('@')[0] ?? 'user',
        role: role ?? 'DEVELOPER',
      },
    });

    const token = signToken({ userId: user.id, email: user.email ?? '', role: user.role });
    res.status(201).json({ data: { token, user: { id: user.id, email: user.email, role: user.role } }, meta: null, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, meta: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user?.passwordHash) {
      res.status(401).json({ data: null, meta: null, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ data: null, meta: null, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email ?? '', role: user.role });
    res.json({ data: { token, user: { id: user.id, email: user.email, role: user.role } }, meta: null, error: null });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ data: null, meta: null, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
      return;
    }
    const secret = process.env['JWT_SECRET'];
    if (!secret) throw new Error('JWT_SECRET not configured');
    let payload: { userId: string };
    try {
      payload = jwt.verify(header.slice(7), secret) as { userId: string };
    } catch {
      res.status(401).json({ data: null, meta: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, email: true, githubLogin: true, role: true, createdAt: true } });
    if (!user) {
      res.status(404).json({ data: null, meta: null, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.json({ data: user, meta: null, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
