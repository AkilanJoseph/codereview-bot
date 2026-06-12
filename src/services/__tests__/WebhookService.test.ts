import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/client', () => ({
  prisma: {
    repository: { findUnique: vi.fn() },
    review:     { create: vi.fn() },
  },
}));

vi.mock('../../queue/JobQueue', () => ({
  jobQueue: { enqueue: vi.fn(), register: vi.fn(), start: vi.fn() },
}));

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { prisma } from '../../db/client';
import { jobQueue } from '../../queue/JobQueue';
import { WebhookService } from '../WebhookService';

const mockedPrisma = vi.mocked(prisma);
const mockedQueue = vi.mocked(jobQueue);

const openedPayload = {
  action: 'opened',
  number: 7,
  installation: { id: 1 },
  repository: {
    id: 99,
    name: 'demo-app',
    owner: { login: 'acme' },
  },
  pull_request: {
    title: 'feat: new feature',
    user: { login: 'dev-alice' },
    html_url: 'https://github.com/acme/demo-app/pull/7',
    base: { ref: 'main' },
    head: { ref: 'feat/new' },
  },
};

const REPO = { id: 'repo-1', owner: 'acme', name: 'demo-app', installId: 'install-1', active: true };

beforeEach(() => vi.clearAllMocks());

describe('WebhookService.handlePrEvent', () => {
  it('looks up repository by githubRepoId', async () => {
    mockedPrisma.repository.findUnique.mockResolvedValue(REPO as never);
    mockedPrisma.review.create.mockResolvedValue({ id: 'rev-1' } as never);

    const service = new WebhookService();
    await service.handlePrEvent(openedPayload);

    expect(mockedPrisma.repository.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { githubRepoId: 99 } }),
    );
  });

  it('creates a review and enqueues the analysis job', async () => {
    mockedPrisma.repository.findUnique.mockResolvedValue(REPO as never);
    mockedPrisma.review.create.mockResolvedValue({ id: 'rev-1' } as never);

    const service = new WebhookService();
    await service.handlePrEvent(openedPayload);

    expect(mockedPrisma.review.create).toHaveBeenCalled();
    expect(mockedQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'analyze_pr', payload: expect.objectContaining({ reviewId: 'rev-1' }) }),
    );
  });

  it('skips non-opened and non-synchronize actions', async () => {
    const service = new WebhookService();
    await service.handlePrEvent({ ...openedPayload, action: 'closed' });

    expect(mockedPrisma.repository.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.review.create).not.toHaveBeenCalled();
  });

  it('skips when repository is inactive', async () => {
    mockedPrisma.repository.findUnique.mockResolvedValue({ ...REPO, active: false } as never);

    const service = new WebhookService();
    await service.handlePrEvent(openedPayload);

    expect(mockedPrisma.review.create).not.toHaveBeenCalled();
  });

  it('skips when repository is not registered', async () => {
    mockedPrisma.repository.findUnique.mockResolvedValue(null);

    const service = new WebhookService();
    await service.handlePrEvent(openedPayload);

    expect(mockedPrisma.review.create).not.toHaveBeenCalled();
  });

  it('handles synchronize action the same as opened', async () => {
    mockedPrisma.repository.findUnique.mockResolvedValue(REPO as never);
    mockedPrisma.review.create.mockResolvedValue({ id: 'rev-sync' } as never);

    const service = new WebhookService();
    await service.handlePrEvent({ ...openedPayload, action: 'synchronize' });

    expect(mockedPrisma.review.create).toHaveBeenCalled();
    expect(mockedQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ reviewId: 'rev-sync' }) }),
    );
  });

  it('falls back to repo.installId when installation is absent from payload', async () => {
    mockedPrisma.repository.findUnique.mockResolvedValue(REPO as never);
    mockedPrisma.review.create.mockResolvedValue({ id: 'rev-2' } as never);

    const { installation: _omit, ...payloadNoInstall } = openedPayload;
    const service = new WebhookService();
    await service.handlePrEvent(payloadNoInstall);

    expect(mockedQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ installId: REPO.installId }),
      }),
    );
  });
});
