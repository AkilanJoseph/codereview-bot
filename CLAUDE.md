# CLAUDE.md — CodeReview Bot

## Project: CodeReview Bot
AI-powered GitHub PR analysis tool. See spec for full architecture.

## Language & Runtime
- Node.js 20 LTS, TypeScript 5 strict mode
- Backend: Express + Prisma + PostgreSQL
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS

## Custom Commands
- /review-pr <number>    — manually trigger PR analysis (bypasses webhook)
- /seed-db               — seed database with fixture data
- /run-security-audit    — npm audit + eslint security plugin
- /generate-api-docs     — generate OpenAPI spec from routes

## Architecture Rules
- Scanners live in src/engine/scanners/ — each implements IScanner
- No scanner imports from another scanner
- All DB access via Prisma client from src/db/client.ts — no raw SQL
- API routes in src/api/routes/ — business logic in src/services/

## Code Style
- Prettier: 2 spaces, single quotes, trailing commas
- ESLint: @typescript-eslint/recommended + eslint-plugin-security
- Never commit console.log — use logger (Winston) from src/services/logger.ts
- All async functions must have explicit error handling

## Testing
- Co-located tests: src/engine/scanners/__tests__/rule-name.test.ts
- Unit tests: vi.mock() for all external deps
- Integration tests: use DATABASE_URL_TEST, never production DB
- Coverage target: 80% lines + branches

## Environment Variables
See .env.example for all required variables.
