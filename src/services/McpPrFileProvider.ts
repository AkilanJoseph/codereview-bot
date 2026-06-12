import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { IPrFileProvider } from './PrFileProvider';
import type { PrFile } from '../engine/types';
import { logger } from './logger';

interface McpPrFile {
  filename: string;
  patch?: string;
}

interface McpFileContent {
  content?: string;
  encoding?: string;
}

/**
 * Fetches PR files via the GitHub MCP server (get_pull_request_files + get_file_contents).
 * Uses the MCP SDK client with stdio transport to communicate with the GitHub MCP server process.
 * Requires GITHUB_PERSONAL_ACCESS_TOKEN to be set in the environment.
 */
export class McpPrFileProvider implements IPrFileProvider {
  private client: Client | null = null;

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;

    const token = process.env['GITHUB_PERSONAL_ACCESS_TOKEN'] ?? process.env['GITHUB_TOKEN'];
    if (!token) {
      throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN not set — cannot connect to GitHub MCP server');
    }

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        ...process.env,
        GITHUB_PERSONAL_ACCESS_TOKEN: token,
      } as Record<string, string>,
    });

    const client = new Client({ name: 'codereview-bot', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
    this.client = client;
    return client;
  }

  async getPrFiles(owner: string, repo: string, prNumber: number, _installId: string): Promise<PrFile[]> {
    try {
      const client = await this.getClient();

      const filesResult = await client.callTool({
        name: 'get_pull_request_files',
        arguments: { owner, repo, pullNumber: prNumber },
      });

      const rawText = (filesResult.content as Array<{ type: string; text?: string }>)
        .find((c) => c.type === 'text')?.text ?? '[]';

      const fileList = JSON.parse(rawText) as McpPrFile[];

      const prFiles: PrFile[] = await Promise.all(
        fileList.map(async (f) => {
          try {
            const contentResult = await client.callTool({
              name: 'get_file_contents',
              arguments: { owner, repo, path: f.filename },
            });

            const contentText = (contentResult.content as Array<{ type: string; text?: string }>)
              .find((c) => c.type === 'text')?.text ?? '{}';

            const parsed = JSON.parse(contentText) as McpFileContent;
            const content =
              parsed.encoding === 'base64' && parsed.content
                ? Buffer.from(parsed.content, 'base64').toString('utf8')
                : (parsed.content ?? '');

            return { filePath: f.filename, content, patch: f.patch };
          } catch (err) {
            logger.warn('McpPrFileProvider: failed to fetch file content', { file: f.filename, err });
            return { filePath: f.filename, content: '', patch: f.patch };
          }
        }),
      );

      return prFiles;
    } catch (err) {
      logger.error('McpPrFileProvider: failed to fetch PR files via MCP', { owner, repo, prNumber, err });
      return [];
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}
