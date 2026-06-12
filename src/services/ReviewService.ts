import { prisma } from '../db/client';
import type { Category, Severity } from '../generated/prisma/enums';
import { AnalysisEngine } from '../engine/AnalysisEngine';
import type { IPrFileProvider } from './PrFileProvider';
import { logger } from './logger';

export interface CreateReviewInput {
  repositoryId: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  prUrl: string;
  baseBranch: string;
  headBranch: string;
  owner: string;
  repo: string;
  installId: string;
}

export class ReviewService {
  constructor(
    private readonly fileProvider: IPrFileProvider,
    private readonly engine: AnalysisEngine = new AnalysisEngine(),
  ) {}

  async createReview(input: CreateReviewInput): Promise<string> {
    const review = await prisma.review.create({
      data: {
        repositoryId: input.repositoryId,
        prNumber: input.prNumber,
        prTitle: input.prTitle,
        prAuthor: input.prAuthor,
        prUrl: input.prUrl,
        baseBranch: input.baseBranch,
        headBranch: input.headBranch,
        status: 'PENDING',
      },
    });
    return review.id;
  }

  async runAnalysis(reviewId: string, owner: string, repo: string, prNumber: number, installId: string): Promise<void> {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    try {
      const files = await this.fileProvider.getPrFiles(owner, repo, prNumber, installId);
      const findings = await this.engine.analyze(files);

      // Resolve rule IDs from slugs, creating rules on first encounter.
      const ruleCache = new Map<string, string>();

      for (const finding of findings) {
        let ruleId = ruleCache.get(finding.ruleSlug);
        if (!ruleId) {
          const rule = await prisma.rule.upsert({
            where: { slug: finding.ruleSlug },
            create: {
              slug: finding.ruleSlug,
              name: slugToName(finding.ruleSlug),
              description: finding.message,
              category: finding.category as Category,
              defaultSeverity: finding.severity as Severity,
            },
            update: {},
          });
          ruleId = rule.id ?? '';
          ruleCache.set(finding.ruleSlug, ruleId);
        }

        await prisma.finding.create({
          data: {
            reviewId,
            ruleId,
            filePath: finding.filePath,
            lineStart: finding.lineStart,
            lineEnd: finding.lineEnd,
            category: finding.category as Category,
            severity: finding.severity as Severity,
            message: finding.message,
            suggestion: finding.suggestion,
          },
        });
      }

      await prisma.review.update({
        where: { id: reviewId },
        data: { status: 'COMPLETE', completedAt: new Date() },
      });

      logger.info('Analysis complete', { reviewId, findingCount: findings.length });
    } catch (err) {
      logger.error('Analysis failed', { reviewId, err });
      await prisma.review.update({
        where: { id: reviewId },
        data: { status: 'FAILED' },
      });
    }
  }
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
