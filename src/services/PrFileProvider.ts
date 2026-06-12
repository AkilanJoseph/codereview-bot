import type { PrFile } from '../engine/types';
import { logger } from './logger';

export interface IPrFileProvider {
  getPrFiles(owner: string, repo: string, prNumber: number, installId: string): Promise<PrFile[]>;
}

/**
 * Wraps GitHub file access for the analysis engine.
 * In production this would call the GitHub MCP server (get_pull_request_files,
 * get_file_contents tools). For now it uses the GitHub REST API via fetch so
 * the engine can run without an MCP server configured locally.
 */
export class PrFileProvider implements IPrFileProvider {
  async getPrFiles(
    owner: string,
    repo: string,
    prNumber: number,
    _installId: string,
  ): Promise<PrFile[]> {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
      logger.warn('GITHUB_TOKEN not set — PrFileProvider returning empty file list');
      return [];
    }

    try {
      const filesRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
        { headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } },
      );

      if (!filesRes.ok) {
        logger.error('GitHub API error fetching PR files', { status: filesRes.status });
        return [];
      }

      const fileList = (await filesRes.json()) as Array<{
        filename: string;
        patch?: string;
        raw_url: string;
        status: string;
      }>;

      const prFiles: PrFile[] = await Promise.all(
        fileList
          .filter((f) => f.status !== 'removed')
          .map(async (f) => {
            try {
              const contentRes = await fetch(f.raw_url, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const content = contentRes.ok ? await contentRes.text() : '';
              return { filePath: f.filename, content, patch: f.patch };
            } catch {
              return { filePath: f.filename, content: '', patch: f.patch };
            }
          }),
      );

      return prFiles;
    } catch (err) {
      logger.error('Failed to fetch PR files', { err });
      return [];
    }
  }
}
