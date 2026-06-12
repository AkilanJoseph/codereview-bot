import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createHmac } from 'crypto';

vi.mock('../../../services/WebhookService', () => ({
  WebhookService: vi.fn().mockImplementation(() => ({
    handlePrEvent: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../queue/JobQueue', () => ({
  jobQueue: { enqueue: vi.fn(), register: vi.fn(), start: vi.fn() },
}));

vi.mock('../../../db/client', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

import { app } from '../../../index';

const SECRET = 'test-webhook-secret-value';

function sign(body: string): string {
  return `sha256=${createHmac('sha256', SECRET).update(Buffer.from(body)).digest('hex')}`;
}

const PR_PAYLOAD = JSON.stringify({
  action: 'opened',
  number: 1,
  installation: { id: 123 },
  repository: { id: 99, name: 'repo', owner: { login: 'org' } },
  pull_request: {
    title: 'feat: new',
    user: { login: 'dev' },
    html_url: 'https://github.com/org/repo/pull/1',
    base: { ref: 'main' },
    head: { ref: 'feat/new' },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env['GITHUB_WEBHOOK_SECRET'] = SECRET;
});

describe('POST /api/webhooks/github', () => {
  it('returns 202 with valid HMAC signature', async () => {
    const res = await request(app)
      .post('/api/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'pull_request')
      .set('x-hub-signature-256', sign(PR_PAYLOAD))
      .send(PR_PAYLOAD);

    expect(res.status).toBe(202);
    expect(res.body.data.accepted).toBe(true);
  });

  it('returns 401 when HMAC signature is missing', async () => {
    const res = await request(app)
      .post('/api/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'pull_request')
      .send(PR_PAYLOAD);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_SIGNATURE');
  });

  it('returns 401 when HMAC signature is wrong', async () => {
    const res = await request(app)
      .post('/api/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'pull_request')
      .set('x-hub-signature-256', 'sha256=invalidsignature')
      .send(PR_PAYLOAD);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
  });

  it('accepts non-pull_request events (ignored silently)', async () => {
    const body = '{}';
    const res = await request(app)
      .post('/api/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', sign(body))
      .send(body);

    expect(res.status).toBe(202);
  });

  it('returns 500 when GITHUB_WEBHOOK_SECRET is not configured', async () => {
    delete process.env['GITHUB_WEBHOOK_SECRET'];

    const res = await request(app)
      .post('/api/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', 'sha256=anything')
      .send(PR_PAYLOAD);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('CONFIG_ERROR');
  });
});
