import 'dotenv/config';
import { prisma } from './client';
import { logger } from '../services/logger';

async function seed(): Promise<void> {
  logger.info('Seeding database…');

  // Repositories
  const [repo1, repo2, repo3] = await Promise.all([
    prisma.repository.upsert({
      where: { githubRepoId: 999001 },
      update: {},
      create: { githubRepoId: 999001, owner: 'acme-corp', name: 'api-gateway', installId: 'install-001' },
    }),
    prisma.repository.upsert({
      where: { githubRepoId: 999002 },
      update: {},
      create: { githubRepoId: 999002, owner: 'acme-corp', name: 'frontend-app', installId: 'install-002' },
    }),
    prisma.repository.upsert({
      where: { githubRepoId: 999003 },
      update: {},
      create: { githubRepoId: 999003, owner: 'acme-corp', name: 'data-pipeline', installId: 'install-003' },
    }),
  ]);

  // Rules
  const ruleDefs = [
    { slug: 'sql-injection',         name: 'SQL Injection',            description: 'Detects string-concatenated SQL queries',           category: 'SECURITY' as const,     defaultSeverity: 'CRITICAL' as const },
    { slug: 'xss',                   name: 'Cross-Site Scripting',     description: 'Detects unescaped user input in render paths',      category: 'SECURITY' as const,     defaultSeverity: 'HIGH' as const },
    { slug: 'hardcoded-secrets',     name: 'Hardcoded Secrets',        description: 'Detects API keys, passwords, tokens in source',     category: 'SECURITY' as const,     defaultSeverity: 'CRITICAL' as const },
    { slug: 'path-traversal',        name: 'Path Traversal',           description: 'Detects unsanitized file path construction',        category: 'SECURITY' as const,     defaultSeverity: 'HIGH' as const },
    { slug: 'n-plus-one',            name: 'N+1 Query',                description: 'Detects database queries inside loops',             category: 'PERFORMANCE' as const,  defaultSeverity: 'HIGH' as const },
    { slug: 'synchronous-io',        name: 'Synchronous I/O',          description: 'Detects blocking I/O calls in async paths',         category: 'PERFORMANCE' as const,  defaultSeverity: 'MEDIUM' as const },
    { slug: 'memory-leak',           name: 'Memory Leak Pattern',      description: 'Detects common memory leak patterns',               category: 'PERFORMANCE' as const,  defaultSeverity: 'MEDIUM' as const },
    { slug: 'cyclomatic-complexity', name: 'Cyclomatic Complexity',     description: 'Functions exceeding complexity threshold',          category: 'STYLE' as const,        defaultSeverity: 'MEDIUM' as const },
    { slug: 'naming-convention',     name: 'Naming Convention',        description: 'Variables using snake_case instead of camelCase',   category: 'STYLE' as const,        defaultSeverity: 'LOW' as const },
    { slug: 'console-log',           name: 'Console Log',              description: 'console.log left in production code',              category: 'STYLE' as const,        defaultSeverity: 'INFO' as const },
  ];

  const ruleMap: Record<string, string> = {};
  for (const rule of ruleDefs) {
    const r = await prisma.rule.upsert({ where: { slug: rule.slug }, update: {}, create: rule });
    ruleMap[rule.slug] = r.id;
  }

  // Users
  const userDefs = [
    { githubLogin: 'dev-alice',   email: 'alice@acme.io',   role: 'ADMIN' as const },
    { githubLogin: 'dev-bob',     email: 'bob@acme.io',     role: 'DEVELOPER' as const },
    { githubLogin: 'dev-charlie', email: 'charlie@acme.io', role: 'DEVELOPER' as const },
    { githubLogin: 'dev-diana',   email: 'diana@acme.io',   role: 'VIEWER' as const },
  ];
  for (const u of userDefs) {
    await prisma.user.upsert({ where: { githubLogin: u.githubLogin }, update: {}, create: u });
  }

  // Reviews
  const reviews = [
    {
      repositoryId: repo1.id,
      prNumber: 42,
      prTitle: 'feat: add JWT authentication middleware',
      prAuthor: 'dev-alice',
      prUrl: 'https://github.com/acme-corp/api-gateway/pull/42',
      baseBranch: 'main',
      headBranch: 'feat/jwt-auth',
      status: 'COMPLETE' as const,
      startedAt: new Date('2026-06-10T09:00:00Z'),
      completedAt: new Date('2026-06-10T09:02:10Z'),
    },
    {
      repositoryId: repo1.id,
      prNumber: 47,
      prTitle: 'fix: sanitize query params in search endpoint',
      prAuthor: 'dev-bob',
      prUrl: 'https://github.com/acme-corp/api-gateway/pull/47',
      baseBranch: 'main',
      headBranch: 'fix/query-sanitize',
      status: 'COMPLETE' as const,
      startedAt: new Date('2026-06-11T10:00:00Z'),
      completedAt: new Date('2026-06-11T10:01:45Z'),
    },
    {
      repositoryId: repo2.id,
      prNumber: 88,
      prTitle: 'feat: dashboard redesign with Tailwind v4',
      prAuthor: 'dev-charlie',
      prUrl: 'https://github.com/acme-corp/frontend-app/pull/88',
      baseBranch: 'main',
      headBranch: 'feat/dashboard-ui',
      status: 'COMPLETE' as const,
      startedAt: new Date('2026-06-11T14:00:00Z'),
      completedAt: new Date('2026-06-11T14:01:30Z'),
    },
    {
      repositoryId: repo2.id,
      prNumber: 91,
      prTitle: 'refactor: extract shared form components',
      prAuthor: 'dev-diana',
      prUrl: 'https://github.com/acme-corp/frontend-app/pull/91',
      baseBranch: 'main',
      headBranch: 'refactor/form-components',
      status: 'RUNNING' as const,
      startedAt: new Date('2026-06-12T08:30:00Z'),
      completedAt: null,
    },
    {
      repositoryId: repo3.id,
      prNumber: 15,
      prTitle: 'feat: add S3 export pipeline stage',
      prAuthor: 'dev-alice',
      prUrl: 'https://github.com/acme-corp/data-pipeline/pull/15',
      baseBranch: 'main',
      headBranch: 'feat/s3-export',
      status: 'COMPLETE' as const,
      startedAt: new Date('2026-06-09T11:00:00Z'),
      completedAt: new Date('2026-06-09T11:03:00Z'),
    },
    {
      repositoryId: repo3.id,
      prNumber: 17,
      prTitle: 'fix: handle null values in transform step',
      prAuthor: 'dev-bob',
      prUrl: 'https://github.com/acme-corp/data-pipeline/pull/17',
      baseBranch: 'main',
      headBranch: 'fix/null-transform',
      status: 'FAILED' as const,
      startedAt: new Date('2026-06-12T07:45:00Z'),
      completedAt: new Date('2026-06-12T07:45:52Z'),
    },
    {
      repositoryId: repo1.id,
      prNumber: 51,
      prTitle: 'chore: upgrade dependencies and fix audit issues',
      prAuthor: 'dev-charlie',
      prUrl: 'https://github.com/acme-corp/api-gateway/pull/51',
      baseBranch: 'main',
      headBranch: 'chore/dep-upgrades',
      status: 'PENDING' as const,
      startedAt: null,
      completedAt: null,
    },
  ];

  const findingData: Array<{
    reviewIdx: number;
    slug: string;
    filePath: string;
    lineStart: number;
    lineEnd: number;
    category: 'SECURITY' | 'PERFORMANCE' | 'STYLE';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    message: string;
    suggestion: string;
  }> = [
    // Review 0 — jwt auth (api-gateway PR #42)
    { reviewIdx: 0, slug: 'hardcoded-secrets', filePath: 'src/middleware/auth.ts',        lineStart: 8,  lineEnd: 8,  category: 'SECURITY',     severity: 'CRITICAL', message: "JWT secret hardcoded as string literal 'super-secret-key'.",                              suggestion: 'Read from process.env.JWT_SECRET; rotate the exposed secret immediately.' },
    { reviewIdx: 0, slug: 'sql-injection',     filePath: 'src/db/sessionRepository.ts',  lineStart: 34, lineEnd: 34, category: 'SECURITY',     severity: 'CRITICAL', message: 'Query built via string concatenation: `SELECT * FROM sessions WHERE token=\' + token`.',  suggestion: 'Use parameterized queries or an ORM.' },
    { reviewIdx: 0, slug: 'n-plus-one',        filePath: 'src/middleware/auth.ts',        lineStart: 57, lineEnd: 63, category: 'PERFORMANCE',  severity: 'HIGH',     message: 'Permission lookup inside request loop fires one DB query per request.',               suggestion: 'Batch permission checks with a single IN() query.' },
    // Review 1 — sanitize query params (api-gateway PR #47)
    { reviewIdx: 1, slug: 'xss',               filePath: 'src/routes/search.ts',          lineStart: 22, lineEnd: 22, category: 'SECURITY',     severity: 'HIGH',     message: 'req.query.term rendered directly into HTML response without escaping.',               suggestion: 'Escape user input with DOMPurify or a server-side sanitizer.' },
    { reviewIdx: 1, slug: 'console-log',       filePath: 'src/routes/search.ts',          lineStart: 40, lineEnd: 40, category: 'STYLE',        severity: 'INFO',     message: 'console.log(\'search query:\', term) left in production path.',                        suggestion: "Replace with logger.debug('search query', { term })." },
    // Review 2 — dashboard UI (frontend PR #88)
    { reviewIdx: 2, slug: 'naming-convention', filePath: 'src/components/DashboardPage.tsx', lineStart: 12, lineEnd: 12, category: 'STYLE',     severity: 'LOW',      message: "Variable 'stat_config' uses snake_case; project convention is camelCase.",           suggestion: "Rename to 'statConfig'." },
    { reviewIdx: 2, slug: 'cyclomatic-complexity', filePath: 'src/components/ChartUtils.ts', lineStart: 44, lineEnd: 90, category: 'STYLE',     severity: 'MEDIUM',   message: 'Function renderChart has cyclomatic complexity of 18 (threshold: 10).',              suggestion: 'Break into smaller focused functions.' },
    // Review 4 — S3 export (data-pipeline PR #15)
    { reviewIdx: 4, slug: 'hardcoded-secrets', filePath: 'src/stages/s3Export.ts',        lineStart: 5,  lineEnd: 5,  category: 'SECURITY',     severity: 'CRITICAL', message: "AWS access key hardcoded: 'AKIAIOSFODNN7EXAMPLE'.",                                    suggestion: 'Use IAM roles or environment variables for credentials.' },
    { reviewIdx: 4, slug: 'path-traversal',    filePath: 'src/stages/s3Export.ts',        lineStart: 71, lineEnd: 73, category: 'SECURITY',     severity: 'HIGH',     message: 'File path constructed from user-supplied bucket prefix without validation.',          suggestion: 'Validate and sanitize the prefix; reject paths containing ../' },
    { reviewIdx: 4, slug: 'synchronous-io',    filePath: 'src/stages/s3Export.ts',        lineStart: 99, lineEnd: 99, category: 'PERFORMANCE',  severity: 'MEDIUM',   message: 'fs.readFileSync() called inside async pipeline stage.',                              suggestion: 'Replace with await fs.promises.readFile().' },
    { reviewIdx: 4, slug: 'memory-leak',       filePath: 'src/stages/s3Export.ts',        lineStart: 120, lineEnd: 135, category: 'PERFORMANCE', severity: 'MEDIUM',  message: 'ReadStream created but never closed on error path.',                                   suggestion: 'Wrap stream handling in a try/finally and call stream.destroy().' },
  ];

  const createdReviews: Array<{ id: string }> = [];
  for (const rev of reviews) {
    const r = await prisma.review.create({ data: rev });
    createdReviews.push(r);
  }

  for (const fd of findingData) {
    const reviewId = createdReviews[fd.reviewIdx]?.id;
    if (!reviewId) continue;
    const ruleId = ruleMap[fd.slug];
    if (!ruleId) continue;
    await prisma.finding.create({
      data: {
        reviewId,
        ruleId,
        filePath: fd.filePath,
        lineStart: fd.lineStart,
        lineEnd: fd.lineEnd,
        category: fd.category,
        severity: fd.severity,
        message: fd.message,
        suggestion: fd.suggestion,
      },
    });
  }

  logger.info('Seed complete', {
    repos: 3,
    rules: ruleDefs.length,
    reviews: reviews.length,
    findings: findingData.length,
  });
}

seed()
  .catch((err) => {
    logger.error('Seed failed', { err });
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
