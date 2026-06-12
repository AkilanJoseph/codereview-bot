import type { PrFile } from '../engine/types';

export const FIXTURES = {
  // SQL injection — true positive
  sqlInjectionVulnerable: {
    filePath: 'src/users.ts',
    content: [
      'const id = req.params.id;',
      "const query = 'SELECT * FROM users WHERE id = ' + id;",
      'db.execute(query);',
    ].join('\n'),
  } satisfies PrFile,

  // SQL injection — true negative (parameterized query)
  sqlInjectionSafe: {
    filePath: 'src/users.ts',
    content: [
      'const id = req.params.id;',
      "const user = await prisma.user.findUnique({ where: { id } });",
    ].join('\n'),
  } satisfies PrFile,

  // Hardcoded secret — true positive
  hardcodedSecretVulnerable: {
    filePath: 'src/config.ts',
    content: [
      "const apiKey = 'AKIAIOSFODNN7EXAMPLE';",
      "const secret = 'supersecretpassword123';",
    ].join('\n'),
  } satisfies PrFile,

  // Hardcoded secret — true negative (env var)
  hardcodedSecretSafe: {
    filePath: 'src/config.ts',
    content: [
      "const apiKey = process.env.API_KEY;",
      "const secret = process.env.JWT_SECRET;",
    ].join('\n'),
  } satisfies PrFile,

  // XSS — true positive
  xssVulnerable: {
    filePath: 'src/render.ts',
    content: [
      'const name = req.query.name;',
      'element.innerHTML = name;',
    ].join('\n'),
  } satisfies PrFile,

  // Empty file — edge case
  emptyFile: {
    filePath: 'src/empty.ts',
    content: '',
  } satisfies PrFile,

  // Large file — edge case (over 1MB)
  largeFile: {
    filePath: 'src/large.ts',
    content: '// comment\n'.repeat(100_000),
  } satisfies PrFile,

  // N+1 — true positive
  nPlusOneVulnerable: {
    filePath: 'src/posts.ts',
    content: [
      'for (const post of posts) {',
      '  const author = await prisma.user.findUnique({ where: { id: post.authorId } });',
      '}',
    ].join('\n'),
  } satisfies PrFile,
};
