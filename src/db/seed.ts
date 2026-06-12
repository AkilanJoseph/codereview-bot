import 'dotenv/config';
import { prisma } from './client';
import { logger } from '../services/logger';

async function seed(): Promise<void> {
  logger.info('Seeding database…');

  const repo = await prisma.repository.upsert({
    where: { githubRepoId: 999999 },
    update: {},
    create: {
      githubRepoId: 999999,
      owner: 'acme-corp',
      name: 'demo-app',
      installId: 'install-demo',
    },
  });

  const rules = [
    { slug: 'sql-injection', name: 'SQL Injection', description: 'Detects string-concatenated SQL queries', category: 'SECURITY' as const, defaultSeverity: 'CRITICAL' as const },
    { slug: 'xss', name: 'Cross-Site Scripting', description: 'Detects unescaped user input in render paths', category: 'SECURITY' as const, defaultSeverity: 'HIGH' as const },
    { slug: 'hardcoded-secrets', name: 'Hardcoded Secrets', description: 'Detects API keys, passwords, and tokens in source', category: 'SECURITY' as const, defaultSeverity: 'CRITICAL' as const },
    { slug: 'n-plus-one', name: 'N+1 Query', description: 'Detects database queries inside loops', category: 'PERFORMANCE' as const, defaultSeverity: 'HIGH' as const },
    { slug: 'synchronous-io', name: 'Synchronous I/O', description: 'Detects blocking I/O calls in async paths', category: 'PERFORMANCE' as const, defaultSeverity: 'MEDIUM' as const },
    { slug: 'cyclomatic-complexity', name: 'Cyclomatic Complexity', description: 'Functions exceeding complexity threshold', category: 'STYLE' as const, defaultSeverity: 'MEDIUM' as const },
    { slug: 'naming-convention', name: 'Naming Convention', description: 'Variables using snake_case instead of camelCase', category: 'STYLE' as const, defaultSeverity: 'LOW' as const },
  ];

  for (const rule of rules) {
    await prisma.rule.upsert({ where: { slug: rule.slug }, update: {}, create: rule });
  }

  const review = await prisma.review.create({
    data: {
      repositoryId: repo.id,
      prNumber: 42,
      prTitle: 'feat: add user authentication',
      prAuthor: 'dev-alice',
      prUrl: 'https://github.com/acme-corp/demo-app/pull/42',
      baseBranch: 'main',
      headBranch: 'feat/auth',
      status: 'COMPLETE',
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  const sqlRule = await prisma.rule.findUniqueOrThrow({ where: { slug: 'sql-injection' } });
  await prisma.finding.create({
    data: {
      reviewId: review.id,
      ruleId: sqlRule.id,
      filePath: 'src/db/userRepository.ts',
      lineStart: 23,
      lineEnd: 23,
      category: 'SECURITY',
      severity: 'CRITICAL',
      message: 'SQL query built via string concatenation — user-controlled input may reach the query.',
      suggestion: 'Use parameterized queries or Prisma ORM.',
    },
  });

  logger.info('Seed complete', { repoId: repo.id, reviewId: review.id });
}

seed()
  .catch((err) => {
    logger.error('Seed failed', { err });
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
