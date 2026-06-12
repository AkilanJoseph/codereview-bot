import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/db/seed.ts',
        'src/db/client.ts',
        'src/mcp/server.ts',
        'src/__fixtures__/**',
        'src/**/__tests__/**',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
      },
    },
  },
});
