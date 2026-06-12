import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/client', () => ({
  prisma: {
    review:  { update: vi.fn(), create: vi.fn() },
    finding: { create: vi.fn() },
    rule:    { upsert: vi.fn() },
  },
}));

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { prisma } from '../../db/client';
import { ReviewService } from '../ReviewService';
import type { IPrFileProvider } from '../PrFileProvider';
import { AnalysisEngine } from '../../engine/AnalysisEngine';

const mockedPrisma = vi.mocked(prisma);

const mockProvider: IPrFileProvider = {
  getPrFiles: vi.fn(),
};

const mockEngine = {
  analyze: vi.fn(),
} as unknown as AnalysisEngine;

beforeEach(() => vi.clearAllMocks());

describe('ReviewService.runAnalysis', () => {
  it('sets status to RUNNING then COMPLETE on success', async () => {
    vi.mocked(mockProvider.getPrFiles).mockResolvedValue([
      { path: 'src/app.ts', content: 'const x = 1;' },
    ]);
    vi.mocked(mockEngine.analyze).mockResolvedValue([]);
    mockedPrisma.review.update.mockResolvedValue({} as never);

    const service = new ReviewService(mockProvider, mockEngine);
    await service.runAnalysis('rev-1', 'org', 'repo', 1, 'install-1');

    expect(mockedPrisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RUNNING' }) }),
    );
    expect(mockedPrisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETE' }) }),
    );
  });

  it('sets status to FAILED when engine throws', async () => {
    vi.mocked(mockProvider.getPrFiles).mockResolvedValue([
      { path: 'src/app.ts', content: 'code' },
    ]);
    vi.mocked(mockEngine.analyze).mockRejectedValue(new Error('engine error'));
    mockedPrisma.review.update.mockResolvedValue({} as never);

    const service = new ReviewService(mockProvider, mockEngine);
    await service.runAnalysis('rev-1', 'org', 'repo', 1, 'install-1');

    expect(mockedPrisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  it('persists findings returned by engine', async () => {
    const findings = [{
      ruleSlug: 'sql-injection', filePath: 'src/db.ts',
      lineStart: 5, lineEnd: 5,
      category: 'SECURITY' as const, severity: 'CRITICAL' as const,
      message: 'SQL injection', suggestion: 'Use ORM',
    }];
    vi.mocked(mockProvider.getPrFiles).mockResolvedValue([{ path: 'src/db.ts', content: 'code' }]);
    vi.mocked(mockEngine.analyze).mockResolvedValue(findings);
    mockedPrisma.rule.upsert.mockResolvedValue({ id: 'rule-1', slug: 'sql-injection' } as never);
    mockedPrisma.review.update.mockResolvedValue({} as never);
    mockedPrisma.finding.create.mockResolvedValue({} as never);

    const service = new ReviewService(mockProvider, mockEngine);
    await service.runAnalysis('rev-1', 'org', 'repo', 1, 'install-1');

    expect(mockedPrisma.finding.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ filePath: 'src/db.ts', reviewId: 'rev-1' }) }),
    );
  });

  it('creates review record via createReview', async () => {
    mockedPrisma.review.create.mockResolvedValue({ id: 'rev-new' } as never);

    const service = new ReviewService(mockProvider, mockEngine);
    const id = await service.createReview({
      repositoryId: 'repo-1', prNumber: 5, prTitle: 'feat', prAuthor: 'alice',
      prUrl: 'https://github.com/org/repo/pull/5', baseBranch: 'main', headBranch: 'feat/x',
      owner: 'org', repo: 'repo', installId: 'install-1',
    });

    expect(id).toBe('rev-new');
    expect(mockedPrisma.review.create).toHaveBeenCalled();
  });
});
