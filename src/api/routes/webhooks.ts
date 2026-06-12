import { Router } from 'express';
import express from 'express';
import { validateHmac } from '../middleware/validateHmac';
import { webhookRateLimiter } from '../middleware/rateLimiter';
import { WebhookService } from '../../services/WebhookService';
import { logger } from '../../services/logger';

const router = Router();
const webhookService = new WebhookService();

router.post(
  '/github',
  webhookRateLimiter,
  express.raw({ type: 'application/json' }),
  validateHmac,
  async (req, res) => {
    // Always return 202 immediately — never block on processing
    res.status(202).json({ data: { accepted: true }, meta: null, error: null });

    const event = req.headers['x-github-event'];
    if (event !== 'pull_request') return;

    try {
      const payload = JSON.parse((req.body as Buffer).toString('utf8'));
      await webhookService.handlePrEvent(payload);
    } catch (err) {
      logger.error('Webhook processing error', { err });
    }
  },
);

export default router;
