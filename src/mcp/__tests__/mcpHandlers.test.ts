import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/client', () => ({
  prisma: {
    repository: { findFirst: vi.fn() },
    review:     { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    finding:    { findMany: vi.fn() },
  },
}));

vi.mock('../../queue/JobQueue', () => ({
  jobQueue: { enqueue: vi.fn(), register: vi.fn(), start: vi.fn() },
}));

import { prisma } from '../../db/client';
import { jobQueue } from '../../queue/JobQueue';
import { handleTriggerReview, handleGetFindings, handleListReviews } from '../mcpHandlers';

const mockedPrisma = vi.mocked(prisma);
const mockedQueue  = vi.mocked(jobQueue);

const REPO    = { id: 'repo-1', owner: 'acme', name: 'api' };
const REVIEW  = { id: 'rev-1', status: 'COMPLETE', prTitle: 'feat', prNumber: 5 };
const FINDING = {
  id: 'f-1', filePath: 'src/db.ts', lineStart: 10, lineEnd: 10,
  category: 'SECURITY', severity: 'CRITICAL', ruleId: 'rule-1',
  message: 'SQL injection', suggestion: 'Use ORM', suppressed: false,
  createdAt: new Date(), reviewId: 'rev-1',
  rule: { id: 'rule-1', name: 'SQL Injection' },
};

beforeEach(() => vi.clearAllMocks());

// ─── trigger_review ────────────────────────────────────────────────────────

describe('handleTriggerReview', () => {
  it('returns not-found message when repo is not registered', async () => {
    mockedPrisma.repository.findFirst.mockResolvedValue(null);

    const result = await handleTriggerReview({ owner: 'acme', repo: 'missing', prNumber: 1, installId: 'i-1' });

    expect(result.content[0]?.text).toContain('not found');
    expect(mockedPrisma.review.create).not.toHaveBeenCalled();
  });

  it('creates a review and enqueues the job when repo exists', async () => {
    mockedPrisma.repository.findFirst.mockResolvedValue(REPO as never);
    mockedPrisma.review.create.mockResolvedValue({ id: 'rev-new', status: 'PENDING' } as never);

    const result = await handleTriggerReview({ owner: 'acme', repo: 'api', prNumber: 7, installId: 'i-1' });

    expect(mockedPrisma.review.create).toHaveBeenCalledOnce();
    expect(mockedQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'analyze_pr', payload: expect.objectContaining({ reviewId: 'rev-new', prNumber: 7 }) }),
    );
    const body = JSON.parse(result.content[0]?.text ?? '{}');
    expect(body.status).toBe('PENDING');
  });
});

// ─── get_findings ──────────────────────────────────────────────────────────

describe('handleGetFindings', () => {
  it('returns not-found message for unknown review', async () => {
    mockedPrisma.review.findUnique.mockResolvedValue(null);

    const result = await handleGetFindings({ reviewId: 'bad-id' });

    expect(result.content[0]?.text).toContain('not found');
  });

  it('returns findings summary for a known review', async () => {
    mockedPrisma.review.findUnique.mockResolvedValue(REVIEW as never);
    mockedPrisma.finding.findMany.mockResolvedValue([FINDING] as never);

    const result = await handleGetFindings({ reviewId: 'rev-1' });

    const body = JSON.parse(result.content[0]?.text ?? '{}');
    expect(body.totalFindings).toBe(1);
    expect(body.findings[0]?.severity).toBe('CRITICAL');
  });

  it('passes severity filter through to the database query', async () => {
    mockedPrisma.review.findUnique.mockResolvedValue(REVIEW as never);
    mockedPrisma.finding.findMany.mockResolvedValue([FINDING] as never);

    await handleGetFindings({ reviewId: 'rev-1', severity: 'CRITICAL' });

    expect(mockedPrisma.finding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ severity: 'CRITICAL' }) }),
    );
  });

  it('returns 0 findings for a review with no findings', async () => {
    mockedPrisma.review.findUnique.mockResolvedValue(REVIEW as never);
    mockedPrisma.finding.findMany.mockResolvedValue([]);

    const result = await handleGetFindings({ reviewId: 'rev-empty' });

    const body = JSON.parse(result.content[0]?.text ?? '{}');
    expect(body.totalFindings).toBe(0);
  });
});

// ─── list_reviews ──────────────────────────────────────────────────────────

describe('handleListReviews', () => {
  const DB_REVIEW = {
    id: 'rev-1', prNumber: 5, prTitle: 'feat', prAuthor: 'alice',
    status: 'COMPLETE', createdAt: new Date(),
    repository: { owner: 'acme', name: 'api' },
    _count: { findings: 3 },
  };

  it('returns list of recent reviews', async () => {
    mockedPrisma.review.findMany.mockResolvedValue([DB_REVIEW] as never);

    const result = await handleListReviews({});

    const body = JSON.parse(result.content[0]?.text ?? '[]');
    expect(body).toHaveLength(1);
    expect(body[0]?.repo).toBe('acme/api');
    expect(body[0]?.findings).toBe(3);
  });

  it('applies status filter', async () => {
    mockedPrisma.review.findMany.mockResolvedValue([]);

    await handleListReviews({ status: 'PENDING' });

    expect(mockedPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }),
    );
  });

  it('applies repoId filter', async () => {
    mockedPrisma.review.findMany.mockResolvedValue([]);

    await handleListReviews({ repoId: 'repo-1' });

    expect(mockedPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ repositoryId: 'repo-1' }) }),
    );
  });

  it('defaults limit to 10', async () => {
    mockedPrisma.review.findMany.mockResolvedValue([]);

    await handleListReviews({});

    expect(mockedPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it('respects a custom limit', async () => {
    mockedPrisma.review.findMany.mockResolvedValue([]);

    await handleListReviews({ limit: 5 });

    expect(mockedPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});
