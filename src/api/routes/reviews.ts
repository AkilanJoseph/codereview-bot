import { Router } from 'express';
import { z } from 'zod/v4';
import { prisma } from '../../db/client';

const router = Router();

const ListSchema = z.object({
  repoId: z.string().optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETE', 'FAILED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/', async (req, res, next) => {
  try {
    const parsed = ListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ data: null, meta: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { repoId, status, page, limit } = parsed.data;
    const where = {
      ...(repoId ? { repositoryId: repoId } : {}),
      ...(status ? { status } : {}),
    };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { repository: true, _count: { select: { findings: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);
    res.json({ data: reviews, meta: { total, page, limit, pages: Math.ceil(total / limit) }, error: null });
  } catch (err) {
    next(err);
  }
});

router.get('/:reviewId', async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params['reviewId'] },
      include: {
        repository: true,
        findings: { include: { rule: true }, orderBy: [{ severity: 'asc' }, { filePath: 'asc' }] },
      },
    });
    if (!review) {
      res.status(404).json({ data: null, meta: null, error: { code: 'NOT_FOUND', message: 'Review not found' } });
      return;
    }
    res.json({ data: review, meta: null, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
