import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';
import { prisma } from '../db/client';
import { jobQueue } from '../queue/JobQueue';
import { logger } from '../services/logger';

const server = new McpServer({
  name: 'codereview-bot',
  version: '1.0.0',
});

server.tool(
  'trigger_review',
  'Trigger an AI code review for a GitHub pull request',
  {
    owner:     z.string().describe('Repository owner (GitHub username or org)'),
    repo:      z.string().describe('Repository name'),
    prNumber:  z.number().int().positive().describe('Pull request number'),
    installId: z.string().describe('GitHub App installation ID'),
  },
  async ({ owner, repo, prNumber, installId }) => {
    const repository = await prisma.repository.findFirst({
      where: { owner, name: repo },
    });
    if (!repository) {
      return { content: [{ type: 'text' as const, text: `Repository ${owner}/${repo} not found. Register it first via POST /api/repos.` }] };
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
        type: 'text' as const,
        text: JSON.stringify({ reviewId: review.id, status: 'PENDING', message: 'Review queued successfully' }),
      }],
    };
  },
);

server.tool(
  'get_findings',
  'Get all findings for a specific review',
  {
    reviewId: z.string().describe('Review ID returned by trigger_review'),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional().describe('Filter by severity'),
  },
  async ({ reviewId, severity }) => {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { status: true, prTitle: true, prNumber: true },
    });
    if (!review) {
      return { content: [{ type: 'text' as const, text: `Review ${reviewId} not found.` }] };
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

    return { content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }] };
  },
);

server.tool(
  'list_reviews',
  'List recent PR reviews with their status and finding counts',
  {
    repoId: z.string().optional().describe('Filter by repository ID'),
    status: z.enum(['PENDING', 'RUNNING', 'COMPLETE', 'FAILED']).optional().describe('Filter by status'),
    limit:  z.number().int().min(1).max(50).default(10).describe('Maximum number of results'),
  },
  async ({ repoId, status, limit }) => {
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

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP server running on stdio');
}

startMcpServer().catch((err) => {
  logger.error('MCP server failed to start', { err });
  process.exit(1);
});
