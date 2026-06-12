import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';
import { logger } from '../services/logger';
import { handleTriggerReview, handleGetFindings, handleListReviews } from './mcpHandlers';

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
  async (args) => {
    const result = await handleTriggerReview(args);
    return { content: result.content.map((c) => ({ type: 'text' as const, text: c.text })) };
  },
);

server.tool(
  'get_findings',
  'Get all findings for a specific review',
  {
    reviewId: z.string().describe('Review ID returned by trigger_review'),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional().describe('Filter by severity'),
  },
  async (args) => {
    const result = await handleGetFindings(args);
    return { content: result.content.map((c) => ({ type: 'text' as const, text: c.text })) };
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
  async (args) => {
    const result = await handleListReviews(args);
    return { content: result.content.map((c) => ({ type: 'text' as const, text: c.text })) };
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
