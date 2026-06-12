import { EventEmitter } from 'events';
import { logger } from '../services/logger';

export interface AnalysisJob {
  type: 'analyze_pr';
  payload: {
    reviewId: string;
    owner: string;
    repo: string;
    prNumber: number;
    installId: string;
  };
}

type JobHandler = (job: AnalysisJob) => Promise<void>;

class JobQueue extends EventEmitter {
  private handlers = new Map<string, JobHandler>();

  enqueue(job: AnalysisJob): void {
    // setImmediate ensures the webhook handler returns 202 before processing starts.
    setImmediate(() => this.emit('job', job));
  }

  register(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  start(): void {
    this.on('job', async (job: AnalysisJob) => {
      const handler = this.handlers.get(job.type);
      if (!handler) {
        logger.warn(`No handler registered for job type: ${job.type}`);
        return;
      }
      try {
        await handler(job);
      } catch (err) {
        logger.error('Job processing failed', { type: job.type, error: err });
      }
    });
  }
}

export const jobQueue = new JobQueue();
