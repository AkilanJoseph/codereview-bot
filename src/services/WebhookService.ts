import { prisma } from '../db/client';
import { jobQueue } from '../queue/JobQueue';
import { logger } from './logger';

interface PrPayload {
  action: string;
  number: number;
  pull_request: {
    title: string;
    user: { login: string };
    html_url: string;
    base: { ref: string };
    head: { ref: string };
  };
  repository: {
    id: number;
    name: string;
    owner: { login: string };
  };
  installation?: { id: number };
}

export class WebhookService {
  async handlePrEvent(payload: PrPayload): Promise<void> {
    if (!['opened', 'synchronize'].includes(payload.action)) return;

    const { repository, pull_request: pr, installation } = payload;

    const repo = await prisma.repository.findUnique({
      where: { githubRepoId: repository.id },
    });

    if (!repo || !repo.active) {
      logger.info('Webhook ignored — repo not registered or inactive', {
        githubRepoId: repository.id,
      });
      return;
    }

    const installId = installation
      ? String(installation.id)
      : repo.installId;

    const review = await prisma.review.create({
      data: {
        repositoryId: repo.id,
        prNumber: payload.number,
        prTitle: pr.title,
        prAuthor: pr.user.login,
        prUrl: pr.html_url,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        status: 'PENDING',
      },
    });

    jobQueue.enqueue({
      type: 'analyze_pr',
      payload: {
        reviewId: review.id,
        owner: repository.owner.login,
        repo: repository.name,
        prNumber: payload.number,
        installId,
      },
    });

    logger.info('PR analysis enqueued', { reviewId: review.id, prNumber: payload.number });
  }
}
