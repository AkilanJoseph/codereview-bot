import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const mockCallTool = vi.fn();
const mockConnect  = vi.fn();
const mockClose    = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect:  mockConnect,
    callTool: mockCallTool,
    close:    mockClose,
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));

import { McpPrFileProvider } from '../McpPrFileProvider';

const FILES_RESPONSE = [
  { filename: 'src/app.ts', patch: '@@ -1,3 +1,4 @@' },
  { filename: 'src/db.ts' },
];

const FILE_CONTENT = { content: Buffer.from('const x = 1;').toString('base64'), encoding: 'base64' };

beforeEach(() => {
  vi.clearAllMocks();
  process.env['GITHUB_PERSONAL_ACCESS_TOKEN'] = 'test-token';
  mockConnect.mockResolvedValue(undefined);
});

describe('McpPrFileProvider', () => {
  it('returns empty array when GITHUB_PERSONAL_ACCESS_TOKEN is not set', async () => {
    delete process.env['GITHUB_PERSONAL_ACCESS_TOKEN'];
    delete process.env['GITHUB_TOKEN'];

    const provider = new McpPrFileProvider();
    const files = await provider.getPrFiles('acme', 'api', 1, 'install-1');

    expect(files).toHaveLength(0);
  });

  it('calls get_pull_request_files with correct arguments', async () => {
    mockCallTool
      .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(FILES_RESPONSE) }] })
      .mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(FILE_CONTENT) }] });

    const provider = new McpPrFileProvider();
    await provider.getPrFiles('acme', 'api', 7, 'install-1');

    expect(mockCallTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'get_pull_request_files', arguments: { owner: 'acme', repo: 'api', pullNumber: 7 } }),
    );
  });

  it('fetches file contents for each file in the PR', async () => {
    mockCallTool
      .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(FILES_RESPONSE) }] })
      .mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(FILE_CONTENT) }] });

    const provider = new McpPrFileProvider();
    const files = await provider.getPrFiles('acme', 'api', 7, 'install-1');

    expect(files).toHaveLength(2);
    expect(files[0]?.filePath).toBe('src/app.ts');
    expect(files[0]?.content).toBe('const x = 1;');
    expect(files[0]?.patch).toBe('@@ -1,3 +1,4 @@');
  });

  it('returns empty content for files that fail to fetch', async () => {
    mockCallTool
      .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(FILES_RESPONSE) }] })
      .mockRejectedValue(new Error('rate limited'));

    const provider = new McpPrFileProvider();
    const files = await provider.getPrFiles('acme', 'api', 7, 'install-1');

    expect(files).toHaveLength(2);
    expect(files[0]?.content).toBe('');
  });

  it('returns empty array when MCP connection fails', async () => {
    mockConnect.mockRejectedValue(new Error('MCP server not available'));

    const provider = new McpPrFileProvider();
    const files = await provider.getPrFiles('acme', 'api', 7, 'install-1');

    expect(files).toHaveLength(0);
  });

  it('reuses client connection across multiple calls', async () => {
    mockCallTool
      .mockResolvedValue({ content: [{ type: 'text', text: '[]' }] });

    const provider = new McpPrFileProvider();
    await provider.getPrFiles('acme', 'api', 1, 'i-1');
    await provider.getPrFiles('acme', 'api', 2, 'i-1');

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('disconnect closes the client', async () => {
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: '[]' }] });

    const provider = new McpPrFileProvider();
    await provider.getPrFiles('acme', 'api', 1, 'i-1');
    await provider.disconnect();

    expect(mockClose).toHaveBeenCalledOnce();
  });
});
