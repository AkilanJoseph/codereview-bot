import { Router } from 'express';
import { z } from 'zod/v4';
import { prisma } from '../../db/client';
import { logger } from '../../services/logger';

const router = Router();

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'DEVELOPER', 'VIEWER']),
});

router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ data: users, meta: { count: users.length }, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/invite', async (req, res, next) => {
  try {
    const parsed = InviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, meta: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    // In v1.0 the invite is logged — actual email delivery is a v1.1 feature.
    logger.info('Team invitation requested', { email: parsed.data.email, role: parsed.data.role });
    res.status(202).json({ data: { invited: true, email: parsed.data.email }, meta: null, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
