import { prisma } from '../db/client';
import { jobQueue } from '../queue/JobQueue';

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResult {
  content: McpTextContent[];
}

export async function handleTriggerReview(args: {
  owner: string;
  repo: string;
  prNumber: number;
  installId: string;
}): Promise<McpToolResult> {
  const { owner, repo, prNumber, installId } = args;

  const repository = await prisma.repository.findFirst({
    where: { owner, name: repo },
  });

  if (!repository) {
    return {
      content: [{
        type: 'text',
        text: `Repository ${owner}/${repo} not found. Register it first via POST /api/repos.`,
      }],
    };
  }

  const review = await prisma.review.create({
    data: {
      repositoryId: repository.id,
      prNumber,
      prTitle: `PR #${prNumber}`,
      prAuthor: 'unknown',
      prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
      baseBranch: 'main',
      headBranch: `pr-${prNumber}`,
      status: 'PENDING',
    },
  });

  jobQueue.enqueue({
    type: 'analyze_pr',
    payload: { reviewId: review.id, owner, repo, prNumber, installId },
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ reviewId: review.id, status: 'PENDING', message: 'Review queued successfully' }),
    }],
  };
}

export async function handleGetFindings(args: {
  reviewId: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
}): Promise<McpToolResult> {
  const { reviewId, severity } = args;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { status: true, prTitle: true, prNumber: true },
  });

  if (!review) {
    return { content: [{ type: 'text', text: `Review ${reviewId} not found.` }] };
  }

  const findings = await prisma.finding.findMany({
    where: { reviewId, ...(severity ? { severity } : {}), suppressed: false },
    include: { rule: true },
    orderBy: [{ severity: 'asc' }, { filePath: 'asc' }],
  });

  const summary = {
    reviewId,
    prTitle: review.prTitle,
    prNumber: review.prNumber,
    status: review.status,
    totalFindings: findings.length,
    findings: findings.map((f) => ({
      id: f.id,
      file: f.filePath,
      line: f.lineStart,
      severity: f.severity,
      category: f.category,
      rule: f.rule?.name ?? f.ruleId,
      message: f.message,
      suggestion: f.suggestion,
    })),
  };

  return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
}

export async function handleListReviews(args: {
  repoId?: string;
  status?: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';
  limit?: number;
}): Promise<McpToolResult> {
  const { repoId, status, limit = 10 } = args;

  const reviews = await prisma.review.findMany({
    where: {
      ...(repoId ? { repositoryId: repoId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      repository: { select: { owner: true, name: true } },
      _count: { select: { findings: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const result = reviews.map((r) => ({
    id: r.id,
    repo: r.repository ? `${r.repository.owner}/${r.repository.name}` : 'unknown',
    pr: `#${r.prNumber} ${r.prTitle}`,
    author: r.prAuthor,
    status: r.status,
    findings: r._count.findings,
    createdAt: r.createdAt,
  }));

  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}
