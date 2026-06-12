import { Router } from 'express';
import { z } from 'zod/v4';
import { prisma } from '../../db/client';

const router = Router();

const UpdateRuleSchema = z.object({
  enabled: z.boolean().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
});

router.get('/', async (_req, res, next) => {
  try {
    const rules = await prisma.rule.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.json({ data: rules, meta: { count: rules.length }, error: null });
  } catch (err) {
    next(err);
  }
});

router.patch('/:ruleId', async (req, res, next) => {
  try {
    const rule = await prisma.rule.findUnique({ where: { id: req.params['ruleId'] } });
    if (!rule) {
      res.status(404).json({ data: null, meta: null, error: { code: 'NOT_FOUND', message: 'Rule not found' } });
      return;
    }
    const parsed = UpdateRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, meta: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.enabled !== undefined) data['enabled'] = parsed.data.enabled;
    if (parsed.data.severity !== undefined) data['defaultSeverity'] = parsed.data.severity;

    const updated = await prisma.rule.update({ where: { id: req.params['ruleId'] }, data });
    res.json({ data: updated, meta: null, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
