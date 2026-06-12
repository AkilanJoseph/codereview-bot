import { Router } from 'express';
import { z } from 'zod/v4';
import { prisma } from '../../db/client';

const router = Router();

const CreateRepoSchema = z.object({
  githubRepoId: z.number().int().positive(),
  owner: z.string().min(1),
  name: z.string().min(1),
  installId: z.string().min(1),
});

router.get('/', async (req, res, next) => {
  try {
    const active = req.query['active'];
    const where = active !== undefined ? { active: active === 'true' } : {};
    const repos = await prisma.repository.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ data: repos, meta: { count: repos.length }, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = CreateRepoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, meta: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const repo = await prisma.repository.create({ data: parsed.data });
    res.status(201).json({ data: repo, meta: null, error: null });
  } catch (err) {
    next(err);
  }
});

router.delete('/:repoId', async (req, res, next) => {
  try {
    const repo = await prisma.repository.findUnique({ where: { id: req.params['repoId'] } });
    if (!repo) {
      res.status(404).json({ data: null, meta: null, error: { code: 'NOT_FOUND', message: 'Repository not found' } });
      return;
    }
    await prisma.repository.update({ where: { id: req.params['repoId'] }, data: { active: false } });
    res.json({ data: { deactivated: true }, meta: null, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
