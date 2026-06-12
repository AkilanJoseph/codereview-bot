import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { apiRateLimiter } from './api/middleware/rateLimiter';
import { errorHandler } from './api/middleware/errorHandler';
import webhookRouter from './api/routes/webhooks';
import reposRouter from './api/routes/repos';
import reviewsRouter from './api/routes/reviews';
import findingsRouter from './api/routes/findings';
import rulesRouter from './api/routes/rules';
import usersRouter from './api/routes/users';
import { jobQueue } from './queue/JobQueue';
import { ReviewService } from './services/ReviewService';
import { PrFileProvider } from './services/PrFileProvider';
import { AnalysisEngine } from './engine/AnalysisEngine';
import { prisma } from './db/client';
import { logger } from './services/logger';

const app = express();
const PORT = process.env['PORT'] ?? 3000;

const allowedOrigins = process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:5173'];
app.use(cors({ origin: allowedOrigins }));
app.use(apiRateLimiter);
app.use(express.json());

// Routes
app.use('/api/webhooks', webhookRouter);
app.use('/api/repos', reposRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/findings', findingsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: 'ok', db: 'connected', version: '1.0.0' }, meta: null, error: null });
  } catch {
    res.status(503).json({ data: { status: 'degraded', db: 'disconnected', version: '1.0.0' }, meta: null, error: null });
  }
});

app.use(errorHandler);

// Wire up job queue handlers
const reviewService = new ReviewService(new PrFileProvider(), new AnalysisEngine());
jobQueue.register('analyze_pr', async (job) => {
  const { reviewId, owner, repo, prNumber, installId } = job.payload;
  await reviewService.runAnalysis(reviewId, owner, repo, prNumber, installId);
});
jobQueue.start();

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

export { app };
