import { Router } from 'express';
import { z } from 'zod/v4';
import { prisma } from '../../db/client';

const router = Router();

const ListSchema = z.object({
  reviewId: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
  category: z.enum(['SECURITY', 'PERFORMANCE', 'STYLE']).optional(),
  suppressed: z.enum(['true', 'false']).optional(),
});

const SuppressSchema = z.object({
  reason: z.string().min(1),
});

router.get('/', async (req, res, next) => {
  try {
    const parsed = ListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ data: null, meta: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { reviewId, severity, category, suppressed } = parsed.data;
    const where = {
      ...(reviewId ? { reviewId } : {}),
      ...(severity ? { severity } : {}),
      ...(category ? { category } : {}),
      ...(suppressed !== undefined ? { suppressed: suppressed === 'true' } : {}),
    };
    const findings = await prisma.finding.findMany({
      where,
      include: { rule: true },
      orderBy: [{ severity: 'asc' }, { filePath: 'asc' }, { lineStart: 'asc' }],
    });
    res.json({ data: findings, meta: { count: findings.length }, error: null });
  } catch (err) {
    next(err);
  }
});

router.patch('/:findingId/suppress', async (req, res, next) => {
  try {
    const finding = await prisma.finding.findUnique({ where: { id: req.params['findingId'] } });
    if (!finding) {
      res.status(404).json({ data: null, meta: null, error: { code: 'NOT_FOUND', message: 'Finding not found' } });
      return;
    }
    const parsed = SuppressSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, meta: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const updated = await prisma.finding.update({
      where: { id: req.params['findingId'] },
      data: { suppressed: true },
    });
    res.json({ data: updated, meta: null, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
