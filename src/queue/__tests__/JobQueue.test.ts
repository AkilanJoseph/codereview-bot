import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { JobQueue } from '../JobQueue';

function makeQueue() {
  return new JobQueue();
}

const JOB = {
  type: 'analyze_pr' as const,
  payload: { reviewId: 'rev-1', owner: 'acme', repo: 'api', prNumber: 1, installId: 'inst-1' },
};

beforeEach(() => vi.clearAllMocks());

describe('JobQueue', () => {
  it('calls registered handler when job is emitted', async () => {
    const queue = makeQueue();
    const handler = vi.fn().mockResolvedValue(undefined);
    queue.register('analyze_pr', handler);
    queue.start();

    queue.emit('job', JOB);
    await new Promise((r) => setImmediate(r));

    expect(handler).toHaveBeenCalledWith(JOB);
  });

  it('enqueues job via setImmediate and emits it', async () => {
    const queue = makeQueue();
    const handler = vi.fn().mockResolvedValue(undefined);
    queue.register('analyze_pr', handler);
    queue.start();

    queue.enqueue(JOB);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(handler).toHaveBeenCalledWith(JOB);
  });

  it('logs a warning for unregistered job type', async () => {
    const { logger } = await import('../../services/logger');
    const queue = makeQueue();
    queue.start();

    queue.emit('job', { ...JOB, type: 'unknown_type' as never });
    await new Promise((r) => setImmediate(r));

    expect(logger.warn).toHaveBeenCalled();
  });

  it('logs error and does not throw when handler fails', async () => {
    const { logger } = await import('../../services/logger');
    const queue = makeQueue();
    queue.register('analyze_pr', vi.fn().mockRejectedValue(new Error('handler error')));
    queue.start();

    queue.emit('job', JOB);
    await new Promise((r) => setImmediate(r));

    expect(logger.error).toHaveBeenCalled();
  });
});
