# CodeReview Bot — AI-Powered PR Review Assistant
## Capstone Project Specification

**Version:** 1.0  
**Date:** June 11, 2026  
**Author:** Capstone Student  
**Status:** Final

---

## Table of Contents

1. [Phase 1 — Project Overview & Goals](#phase-1)
2. [Phase 2 — Architecture & Technical Design](#phase-2)
3. [Phase 3 — Feature Specification & API Contract](#phase-3)
   - 3.1 REST API Endpoints
   - 3.2 Frontend Component Specification
   - 3.3 CLAUDE.md — Project Conventions
   - 3.4 CRISP Prompting Conventions *(Module 1)*
   - 3.5 Debugging Strategy *(Module 2)*
4. [Phase 4 — Testing, Security & Quality Standards](#phase-4)
5. [Phase 5 — CI/CD, Deployment & Delivery](#phase-5)

---

## Module Skill Coverage Map

| Module Skill | Spec Location |
|---|---|
| CRISP Prompting | Phase 3, Section 3.4 — four full templates with all 5 elements |
| Debugging | Phase 3, Section 3.5 — local, test, and CI debugging workflows |
| TDD | Phase 4, Section 4.1 — test layers, coverage targets, true positive/negative cases |
| Full-Stack Development | Phase 2 (backend architecture) + Phase 3 (API + frontend components) |
| Plan Mode | Phase 2, Section 2.6 — Decision Log; Phase 3, Section 3.4 Template 3 |
| MCP Integration | Phase 2, Section 2.5 — GitHub MCP, PrFileProvider wrapper |
| CI/CD | Phase 5, Section 5.1 — full GitHub Actions YAML, merge protection rules |
| Security Audit | Phase 4, Section 4.2 — 10-item audit checklist, accepted risk statement |

---

### 1.1 Purpose

CodeReview Bot is a full-stack web application that automates the initial review of GitHub Pull Requests. It listens for PR webhook events, analyzes changed files for security vulnerabilities, performance issues, and style violations, and surfaces actionable findings in a developer-facing dashboard.

The system is designed around a single guiding principle: **signal over noise**. Every finding must be specific, located (file + line), and accompanied by a remediation suggestion. A reviewer who reads a finding should know exactly what to fix and why — without needing to re-read the code.

### 1.2 Problem Statement

Manual code review is expensive and inconsistent. Junior reviewers miss security patterns; senior reviewers waste time on style issues that tooling could catch. Existing tools (ESLint, Semgrep, CodeClimate) produce raw findings but lack a unified review lifecycle — they don't track history per PR, per repo, or per team over time.

CodeReview Bot fills this gap by combining automated static analysis with a structured review workflow and a persistent historical record.

### 1.3 Stakeholders

| Role | Needs |
|---|---|
| Developer (PR Author) | Fast feedback, specific findings, not a wall of warnings |
| Team Lead / Reviewer | Dashboard overview, ability to suppress false positives, team-wide metrics |
| Repository Admin | Control which rules run on which repos, severity thresholds |
| System Admin | Deployment health, webhook reliability, audit logs |

### 1.4 Success Criteria

The project is complete when:

- A newly opened PR on a connected repo triggers a full analysis within 30 seconds
- The dashboard displays findings grouped by severity with file and line references
- 80%+ test coverage across backend and analysis engine
- Zero critical or high security findings in the application's own codebase (self-audit)
- All 5 specification phases are documented and cross-referenced in the README
- At least one MCP server (GitHub MCP) is integrated and demonstrably used in the analysis flow
- CI/CD pipeline runs on every push and blocks merge on test or security failure

### 1.5 Out of Scope (v1.0)

- Auto-applying fixes via PR commits
- Support for non-GitHub VCS providers (GitLab, Bitbucket)
- AI-generated review summaries posted as PR comments (planned for v1.1)
- Real-time streaming of analysis results (WebSocket upgrade)

---

## Phase 2 — Architecture & Technical Design {#phase-2}

### 2.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub                                   │
│  PR opened/updated → Webhook POST → /api/webhooks/github        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    Backend (Node.js / Express)                  │
│                                                                 │
│  ┌─────────────────┐    ┌────────────────────────────────────┐  │
│  │ Webhook Handler │───▶│        Job Queue (in-process)      │  │
│  │  HMAC verify    │    │   Enqueue → Analysis Engine        │  │
│  └─────────────────┘    └────────────────┬───────────────────┘  │
│                                          │                      │
│  ┌───────────────────────────────────────▼───────────────────┐  │
│  │                   Analysis Engine                         │  │
│  │  ┌─────────────────┐ ┌──────────────┐ ┌────────────────┐ │  │
│  │  │ Security Scanner│ │  Perf Flags  │ │ Style Checker  │ │  │
│  │  │ injection, XSS  │ │ N+1, indexes │ │ naming, cmplx  │ │  │
│  │  │ hardcoded secrets│ │              │ │                │ │  │
│  │  └────────┬────────┘ └──────┬───────┘ └───────┬────────┘ │  │
│  │           └─────────────────┴─────────────────┘          │  │
│  │                             │                             │  │
│  │                    Finding Aggregator                     │  │
│  │             (dedupe, rank, filter noise)                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐    │
│  │            Prisma ORM  ←→  PostgreSQL                   │    │
│  │   Repository | Review | Finding | Rule | User           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               REST API  (Express Router)                 │   │
│  │  /api/repos  /api/reviews  /api/findings  /api/rules     │   │
│  │  /api/users  /api/webhooks/github  /api/health           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ JSON over HTTP
┌──────────────────────────────▼──────────────────────────────────┐
│                  Frontend (React + TypeScript + Vite)           │
│                                                                 │
│  Dashboard  |  Review Detail  |  Configuration  |  Team Mgmt   │
└─────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                     MCP Integration                             │
│              GitHub MCP Server (PR file access)                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20 LTS | Matches module coursework; async I/O suits webhook handling |
| API Framework | Express 4 | Minimal, well-understood, easy to test |
| Language | TypeScript 5 | Type safety across engine and API reduces runtime surprises |
| ORM | Prisma 5 | Schema-first, auto-generated migrations, excellent TypeScript types |
| Database | PostgreSQL 16 | ACID guarantees for review history; JSONB for flexible finding metadata |
| Frontend Framework | React 18 + TypeScript | Module requirement; hooks-based for testability |
| Build Tool | Vite 5 | Fast HMR; tree-shaking for production builds |
| Styling | Tailwind CSS | Utility-first; no custom CSS maintenance burden |
| Testing (backend) | Vitest + Supertest | Fast; compatible with ESM; Supertest for HTTP-level integration tests |
| Testing (frontend) | Vitest + React Testing Library | Component-level, behavior-focused |
| MCP Integration | GitHub MCP Server (`@modelcontextprotocol/server-github`) | First-party; provides `get_pull_request_files`, `get_file_contents` |
| CI/CD | GitHub Actions | Native GitHub integration; free for public repos |
| Containerization | Docker + Docker Compose | Reproducible local dev environment |

### 2.3 Database Schema

```prisma
model User {
  id          String       @id @default(cuid())
  githubLogin String       @unique
  email       String?
  role        Role         @default(DEVELOPER)
  createdAt   DateTime     @default(now())
  repos       Repository[] @relation("RepoMembers")
}

model Repository {
  id          String   @id @default(cuid())
  githubRepoId Int     @unique
  owner       String
  name        String
  installId   String   // GitHub App installation ID
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  members     User[]   @relation("RepoMembers")
  reviews     Review[]
  rulesets    Ruleset[]
}

model Review {
  id           String     @id @default(cuid())
  prNumber     Int
  prTitle      String
  prAuthor     String
  prUrl        String
  baseBranch   String
  headBranch   String
  status       ReviewStatus @default(PENDING)
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime   @default(now())
  repositoryId String
  repository   Repository @relation(fields: [repositoryId], references: [id])
  findings     Finding[]
}

model Finding {
  id          String      @id @default(cuid())
  filePath    String
  lineStart   Int
  lineEnd     Int?
  category    Category
  severity    Severity
  ruleId      String
  message     String
  suggestion  String
  suppressed  Boolean     @default(false)
  createdAt   DateTime    @default(now())
  reviewId    String
  review      Review      @relation(fields: [reviewId], references: [id])
  rule        Rule        @relation(fields: [ruleId], references: [id])
}

model Rule {
  id          String    @id @default(cuid())
  slug        String    @unique   // e.g. "sql-injection", "n-plus-one"
  name        String
  description String
  category    Category
  defaultSeverity Severity
  enabled     Boolean   @default(true)
  findings    Finding[]
  rulesets    Ruleset[]
}

model Ruleset {
  id           String     @id @default(cuid())
  name         String
  repositoryId String
  repository   Repository @relation(fields: [repositoryId], references: [id])
  rules        Rule[]
  overrides    Json       // { "sql-injection": { severity: "CRITICAL", enabled: true } }
}

enum Role     { ADMIN DEVELOPER VIEWER }
enum ReviewStatus { PENDING RUNNING COMPLETE FAILED }
enum Category { SECURITY PERFORMANCE STYLE }
enum Severity { CRITICAL HIGH MEDIUM LOW INFO }
```

**Relationships summary:**
- `Repository` → `Review` (one-to-many): a repo accumulates reviews over time
- `Review` → `Finding` (one-to-many): each review produces zero or more findings
- `Rule` → `Finding` (one-to-many): each finding is produced by exactly one rule
- `Repository` → `Ruleset` (one-to-many): repos can have multiple named rulesets
- `User` ↔ `Repository` (many-to-many): team membership

### 2.4 Analysis Engine Design

The engine is the core intellectual challenge. It must produce **actionable findings**, not raw pattern matches.

**Actionability contract:** Every finding must have:
1. An exact file path and line range
2. A `message` explaining *what* was found
3. A `suggestion` explaining *how* to fix it
4. A `severity` calibrated to actual exploitability (not worst-case)

**Scanner modules:**

```
SecurityScanner
├── SqlInjectionRule        — detects string-concatenated SQL queries
├── XssRule                 — detects unescaped user input in render paths
├── HardcodedSecretsRule    — regex patterns for API keys, passwords, tokens
├── InsecureDeserializeRule — detects eval(), JSON.parse on untrusted input
└── MissingAuthCheckRule    — controller methods without auth middleware

PerformanceScanner
├── NPlusOneRule            — DB query inside a loop
├── MissingIndexRule        — foreign key columns queried without declared index
├── SynchronousIoRule       — fs.readFileSync / blocking calls in async paths
└── LargePayloadRule        — response objects exceeding configurable size limit

StyleScanner
├── NamingConventionRule    — camelCase for vars, PascalCase for classes
├── CyclomaticComplexityRule— functions exceeding complexity threshold (default: 10)
├── LongFunctionRule        — functions exceeding line threshold (default: 50)
└── MagicNumberRule         — numeric literals not assigned to named constants
```

**Noise reduction strategy:**
- Rules have a configurable `confidence` threshold; findings below threshold are suppressed by default
- Duplicate findings (same rule + file + line) within a review are deduplicated
- `INFO` severity findings are batched and summarized rather than listed individually
- Per-repo ruleset overrides allow teams to disable rules that don't apply to their stack

### 2.5 MCP Integration — GitHub MCP

The analysis engine fetches PR file contents via the GitHub MCP server rather than calling the GitHub REST API directly. This decouples the engine from GitHub's API versioning and provides a reusable abstraction.

**MCP tools used:**
- `get_pull_request_files` — returns the list of files changed in a PR with their patch/diff
- `get_file_contents` — returns full file contents for each changed file (needed for context beyond the diff)

**Integration point:** The `PrFileProvider` service class wraps the MCP client. The analysis engine depends on `PrFileProvider`, not on the MCP client directly, so tests can inject a mock provider.

### 2.6 Decision Log

| Decision | Alternative Considered | Rationale |
|---|---|---|
| In-process job queue vs Redis/Bull | Redis adds operational complexity | For v1.0 scope, an async queue using Node EventEmitter is sufficient; extractable later |
| Prisma vs raw SQL | Raw SQL gives more control | Prisma's type safety and migration tooling outweigh the overhead at this scale |
| Vite vs CRA | CRA is deprecated | Vite is the current standard; faster builds |
| GitHub MCP vs direct GitHub API | Direct API is simpler initially | MCP integration is a capstone requirement; the abstraction is also genuinely useful |
| Single monorepo vs separate services | Microservices add DevOps complexity | Monorepo with clear module boundaries is appropriate for a solo capstone project |

---

## Phase 3 — Feature Specification & API Contract {#phase-3}

### 3.1 REST API Endpoints (9 endpoints — exceeds 5 minimum)

All responses follow the envelope format:
```json
{ "data": { ... }, "meta": { ... }, "error": null }
```
Errors:
```json
{ "data": null, "meta": null, "error": { "code": "NOT_FOUND", "message": "..." } }
```

#### Webhooks

**POST /api/webhooks/github**
- Receives GitHub PR webhook events
- Verifies `X-Hub-Signature-256` HMAC header
- Enqueues analysis job for `opened` and `synchronize` events; ignores others
- Always returns `202 Accepted` (do not expose internal state to GitHub)
- Request body: GitHub `pull_request` event payload

#### Repositories

**GET /api/repos**
- Returns all repositories connected to the current user's team
- Query params: `?active=true`

**POST /api/repos**
- Registers a new repository for webhook monitoring
- Body: `{ githubRepoId, owner, name, installId }`

**DELETE /api/repos/:repoId**
- Deactivates a repository (soft delete; preserves history)

#### Reviews

**GET /api/reviews**
- Returns paginated review history
- Query params: `?repoId=&status=&page=&limit=`

**GET /api/reviews/:reviewId**
- Returns a single review with all findings and metadata

#### Findings

**GET /api/findings**
- Returns findings, optionally filtered by review, severity, category, or suppression status
- Query params: `?reviewId=&severity=&category=&suppressed=false`

**PATCH /api/findings/:findingId/suppress**
- Marks a finding as suppressed with a reason
- Body: `{ reason: string }`

#### Rules & Configuration

**GET /api/rules**
- Returns all available rules with their default configuration

**PATCH /api/rules/:ruleId**
- Updates a rule's enabled state or default severity for a given ruleset
- Body: `{ enabled?: boolean, severity?: Severity }`

#### Team

**GET /api/users**
- Returns team members for the authenticated user's workspace

**POST /api/users/invite**
- Sends an invitation to join the team
- Body: `{ email: string, role: Role }`

#### Health

**GET /api/health**
- Returns service health: `{ status: "ok", db: "connected", version: "1.0.0" }`

### 3.2 Frontend Component Specification (6 components — exceeds 5 minimum)

**DashboardPage**
- Top-level route `/`
- Shows: total PRs reviewed this week, open findings by severity (bar chart), recent reviews list
- Pulls from `GET /api/reviews` and `GET /api/findings`
- Refreshes every 30 seconds

**ReviewListComponent**
- Renders paginated, filterable list of reviews
- Columns: PR number, title, author, repo, status badge, finding counts by severity, timestamp
- Clicking a row navigates to ReviewDetailPage

**ReviewDetailPage**
- Route `/reviews/:reviewId`
- Shows: PR metadata header, findings grouped by file, then by severity within each file
- Each finding shows: rule name, severity badge, line reference, message, suggestion
- Suppress button per finding (calls PATCH /api/findings/:id/suppress)

**ConfigurationPage**
- Route `/settings/rules`
- Lists all rules in a table with toggle (enabled/disabled) and severity selector
- Changes are saved per-repo via PATCH /api/rules/:ruleId
- Groups rules by category (Security, Performance, Style)

**TeamManagementPage**
- Route `/settings/team`
- Shows connected repositories with active/inactive toggle
- Shows team members with role labels
- Invite form (email + role selector)

**FindingsBadge (shared component)**
- Displays a colored severity badge: CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (blue), INFO (gray)
- Used in ReviewListComponent and ReviewDetailPage

### 3.3 CLAUDE.md — Project Conventions

```markdown
# CLAUDE.md

## Project: CodeReview Bot

### Language & Runtime
- Node.js 20 LTS, TypeScript 5 strict mode
- ESM modules throughout (`.js` extensions in imports)

### Custom Commands
- `/review-pr <number>` — manually trigger analysis for a PR number on the default test repo
- `/seed-db` — seeds the database with fixture data for local development
- `/run-security-audit` — runs npm audit + eslint security plugin on the codebase
- `/generate-api-docs` — generates OpenAPI spec from route definitions

### Code Style
- Prettier config: 2 spaces, single quotes, trailing commas
- ESLint: `@typescript-eslint/recommended` + `eslint-plugin-security`
- Never commit `console.log`; use the `logger` service (Winston)
- All async functions must have explicit error handling (no unhandled rejections)

### Architecture Rules
- Analysis engine modules live in `src/engine/scanners/`; each scanner is a class implementing `IScanner`
- No scanner may import from another scanner (no cross-contamination of findings)
- Database access only via Prisma client exported from `src/db/client.ts`
- No raw SQL strings in application code
- API routes live in `src/api/routes/`; business logic in `src/services/`

### Testing
- Test files co-located: `src/engine/scanners/__tests__/sql-injection.test.ts`
- Unit tests use `vi.mock()` for all external dependencies
- Integration tests use a test database (separate `DATABASE_URL_TEST` env var)
- Coverage target: 80% lines + branches

### Environment Variables
Required in `.env` (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `GITHUB_WEBHOOK_SECRET` — HMAC secret for webhook verification
- `GITHUB_APP_ID` + `GITHUB_PRIVATE_KEY` — GitHub App credentials for MCP
- `PORT` — defaults to 3000
```

### 3.4 CRISP Prompting Conventions

All AI-assisted development in this project follows the **CRISP** prompting framework from Module 1. Every non-trivial prompt to Claude must include all five elements. This section documents the standard templates used across the project lifecycle.

**CRISP structure:**

| Element | Meaning | Purpose |
|---|---|---|
| **C** — Context | Background on the codebase, current state, constraints | Prevents Claude from making assumptions that conflict with existing design |
| **R** — Role | The expert persona Claude should adopt | Focuses output style and depth (e.g. "senior security engineer" vs "junior dev reviewer") |
| **I** — Instructions | Specific, unambiguous task description | The actual ask — what to produce or decide |
| **S** — Style | Format, length, tone of output | Controls whether Claude returns prose, code, a table, a list |
| **P** — Parameters | Hard constraints and non-negotiables | Guards against outputs that violate project rules |

---

**Template 1 — Building a new scanner rule**

```
C: I'm building a static analysis scanner for the CodeReview Bot project.
   The scanner receives a list of { filePath, content } objects representing
   files changed in a GitHub PR. Each scanner implements the IScanner interface
   (src/engine/IScanner.ts) which has a single method: analyze(files) → Finding[].
   The Finding type is defined in src/engine/types.ts. We use TypeScript 5 strict mode
   and ESM imports.

R: Act as a senior application security engineer who writes production-quality
   TypeScript and understands both static analysis techniques and false-positive risk.

I: Implement the HardcodedSecretsRule scanner. It should detect:
   - AWS access keys (AKIA...)
   - Generic high-entropy strings assigned to variables named password, secret, token, key
   - Private key PEM blocks
   For each match, return a Finding with filePath, lineStart, severity CRITICAL,
   category SECURITY, a specific message, and a concrete suggestion.

S: Return only the TypeScript source file. Include inline comments explaining
   why each regex was chosen. No prose explanation outside the code.

P: - Do not use eval() or execute any file content
   - Do not flag environment variable reads (process.env.*) as findings
   - Confidence threshold: only return findings you are >85% confident are true positives
   - Must have a corresponding __tests__/hardcoded-secrets.test.ts with true positive,
     true negative, and edge case coverage
```

---

**Template 2 — Debugging a failing test**

```
C: I'm working on the CodeReview Bot backend. The ReviewService.createReview()
   method is failing its integration test. The test uses a real PostgreSQL test
   database (DATABASE_URL_TEST). Prisma migrations have been applied.
   Here is the failing test output: [paste output]
   Here is the service method: [paste code]
   Here is the Prisma schema for Review and Finding: [paste schema]

R: Act as a TypeScript backend engineer experienced with Prisma and PostgreSQL
   debugging. Be systematic — identify root cause before proposing a fix.

I: Diagnose why the test is failing. Walk through the error, identify the
   root cause, and provide a minimal fix. Do not refactor unrelated code.

S: First give a 2-sentence root cause diagnosis. Then show the exact code
   change needed as a diff. Then explain in one sentence why this fixes it.

P: - Do not change the Prisma schema
   - Do not change the test itself unless the test has a genuine bug
   - Fix must not break the other ReviewService tests
```

---

**Template 3 — Plan Mode: architectural decision**

```
C: I'm at the start of building the Analysis Engine for CodeReview Bot.
   The engine receives ~20 changed files per PR and must complete analysis
   in under 30 seconds. I have three scanner categories (security, performance,
   style) each with 4-5 rules.

R: Act as a software architect making a pragmatic decision for a solo-developer
   capstone project that must be completed within 2 weeks.

I: Compare two approaches for running the scanners:
   (A) Sequential — run each scanner in series, one file at a time
   (B) Parallel — run all scanners concurrently using Promise.all per file
   Evaluate on: implementation complexity, debuggability, performance at 20 files,
   and fit with Node.js single-threaded event loop.

S: Return a decision table comparing the two options, then a one-paragraph
   recommendation with your final choice and rationale.

P: - Do not recommend a third option or external queue system
   - Assume no worker threads or child processes
   - Decision must be implementable in TypeScript without additional npm packages
```

---

**Template 4 — Code review / quality check**

```
C: I've just implemented the webhook handler for CodeReview Bot
   (src/api/routes/webhooks.ts). It verifies the GitHub HMAC signature,
   parses the PR event payload, and enqueues an analysis job.

R: Act as a security-focused code reviewer doing a pre-merge review.

I: Review this file for: (1) security issues, (2) error handling gaps,
   (3) TypeScript type safety issues. [paste code]

S: Return findings as a numbered list. Each finding: one sentence describing
   the issue, one sentence with the fix. Group by category (Security, Error
   Handling, Type Safety). If no issues in a category, say "None found."

P: - Do not comment on style or formatting (ESLint handles that)
   - Do not suggest architectural changes — only issues in the existing code
   - Flag severity: CRITICAL, HIGH, MEDIUM for each finding
```

---

### 3.5 Debugging Strategy

Debugging in this project follows a structured approach across three environments: local development, test suite, and CI.

**Local debugging workflow:**

1. **Reproduce in isolation first.** If a webhook isn't triggering analysis, test the webhook handler in isolation with `curl` before assuming the problem is in the engine. Use `ngrok` to expose localhost for real GitHub webhook delivery during development.

2. **Read the logs before adding console statements.** The `logger` service (Winston) outputs structured JSON in development. Always check logs with `docker compose logs api -f` before instrumenting code.

3. **Use the custom command.** `/review-pr <number>` (defined in CLAUDE.md) bypasses the webhook entirely and directly invokes the analysis engine. If `/review-pr` works but the webhook doesn't, the bug is in webhook parsing, not the engine.

**Test debugging workflow:**

4. **Run a single test file first.** `vitest run src/engine/scanners/__tests__/sql-injection.test.ts` is faster than the full suite. Never debug a failure by running all tests.

5. **Isolate database vs logic failures.** If an integration test fails, first verify migrations are applied: `npx prisma migrate status`. A "table does not exist" error is always a migration issue, not a code bug.

6. **Check fixture data.** Most integration test failures trace back to fixture data not matching the current schema. When the schema changes, update `src/__fixtures__/` immediately.

**CI debugging workflow:**

7. **Read the job that failed, not just the summary.** GitHub Actions shows a green checkmark for passed jobs and red for failed. Always open the failing job's logs — the error is in the last 20 lines of the step output.

8. **Reproduce CI failures locally with Docker.** `docker compose run --rm api npm run test:coverage` replicates the CI environment. If it passes locally but fails in CI, the cause is almost always a missing environment variable or a migration not applied against the test database.

**CRISP prompt for debugging with Claude:**
When stuck on a bug for more than 15 minutes, use Template 2 from Section 3.4. The discipline of writing the context forces clarity about what you actually know vs. what you're assuming — which often surfaces the bug before Claude even responds.

---

## Phase 4 — Testing, Security & Quality Standards {#phase-4}

### 4.1 Test Strategy

**Coverage target:** 80% line and branch coverage across `src/` (excluding generated Prisma types and migration files).

**Test layers:**

| Layer | Tooling | What it tests |
|---|---|---|
| Unit | Vitest | Individual scanner rules, service methods, utility functions |
| Integration | Vitest + Supertest | API endpoints against a test database |
| Component | Vitest + React Testing Library | React components in isolation (no real API calls) |
| End-to-End (smoke) | Playwright (2 critical paths only) | Webhook → analysis → dashboard visibility |

**Critical test cases:**

Security scanner tests must cover:
- True positive: code snippet containing the vulnerability → finding produced
- True negative: clean code that resembles the pattern but is not vulnerable → no finding
- Edge case: empty file, binary file, file larger than 1MB

API endpoint tests must cover:
- Happy path with valid data
- 400 for invalid/missing required fields
- 401 for unauthenticated requests (when auth is added in v1.1)
- 404 for non-existent resources
- HMAC signature verification rejection on webhook endpoint

**Test data:** All test fixtures live in `src/__fixtures__/`. No test should write to a production or shared database.

### 4.2 Security Audit Plan

The application performs a self-audit before delivery. Findings must be remediated or explicitly accepted with documented rationale.

**Audit checklist:**

| Category | Check | Tool |
|---|---|---|
| Dependencies | No critical or high CVEs | `npm audit --audit-level=high` |
| Secrets in code | No hardcoded credentials | `git-secrets`, `truffleHog` |
| Input validation | All user inputs validated/sanitized | Manual review + `zod` schemas |
| SQL injection | All DB queries use Prisma (parameterized) | Code review (no raw SQL) |
| Webhook authenticity | HMAC-SHA256 verification on every webhook | Unit test + manual test |
| CORS policy | Restrict origins to known frontend domains | Express `cors` config review |
| Rate limiting | Webhook endpoint rate-limited | `express-rate-limit` |
| Sensitive data in logs | No tokens, secrets, or PII in log output | Log review |
| Error messages | No stack traces or internal paths exposed in prod | Response interceptor review |
| Environment variables | All secrets in `.env`, not in source | `.gitignore` audit |

**Accepted risk:** The analysis engine itself reads PR code that may contain malicious patterns. The engine must never `eval()` or execute analyzed content. All scanner rules operate on string/AST representations only.

### 4.3 Performance Standards

- Webhook handler must respond within 200ms (enqueue and return; processing is async)
- Full PR analysis for a PR with 20 changed files must complete within 30 seconds
- Dashboard page must load (all API calls complete) within 2 seconds on localhost
- Database queries must not perform sequential scans on the `findings` table; required indexes: `(reviewId)`, `(severity)`, `(category)`

### 4.4 Code Quality Gates

Enforced in CI (merge-blocking):

- `tsc --noEmit` — zero TypeScript errors
- `eslint src/` — zero errors (warnings allowed)
- `vitest run --coverage` — coverage thresholds met
- `npm audit --audit-level=high` — zero high/critical vulnerabilities

---

## Phase 5 — CI/CD, Deployment & Delivery {#phase-5}

### 5.1 GitHub Actions Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test (Node 20)
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: codereviewbot_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/codereviewbot_test
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:coverage
        env:
          DATABASE_URL_TEST: postgresql://postgres:test@localhost:5432/codereviewbot_test

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npx eslint src/ --rule '{"no-eval": "error"}'

  build:
    name: Build
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    name: Deploy (main only)
    needs: [build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway / Render
        run: echo "Deploy step — configured per hosting provider"
```

**Pipeline stages:**
1. **Test** — TypeScript check, lint, unit + integration tests with coverage enforcement, runs against a real PostgreSQL service container
2. **Security** — `npm audit` at high threshold, custom ESLint rules for `eval` and unsafe patterns
3. **Build** — TypeScript compile + Vite frontend build; artifact uploaded
4. **Deploy** — triggered only on `main`; deploys to chosen hosting platform

**Merge protection rules (configure in GitHub repo settings):**
- Require all CI checks to pass before merging
- Require at least 1 approving review
- Dismiss stale reviews on new pushes

### 5.2 Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: codereviewbot
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:devpassword@db:5432/codereviewbot
      PORT: 3000
    depends_on:
      - db
    volumes:
      - .:/app
      - /app/node_modules

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:5173"
    depends_on:
      - api

volumes:
  pgdata:
```

### 5.3 Project File Structure

```
codereview-bot/
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── repos.ts
│   │   │   ├── reviews.ts
│   │   │   ├── findings.ts
│   │   │   ├── rules.ts
│   │   │   ├── users.ts
│   │   │   └── webhooks.ts
│   │   └── middleware/
│   │       ├── validateHmac.ts
│   │       ├── errorHandler.ts
│   │       └── rateLimiter.ts
│   ├── engine/
│   │   ├── scanners/
│   │   │   ├── security/
│   │   │   │   ├── SqlInjectionRule.ts
│   │   │   │   ├── XssRule.ts
│   │   │   │   └── HardcodedSecretsRule.ts
│   │   │   ├── performance/
│   │   │   │   ├── NPlusOneRule.ts
│   │   │   │   └── SynchronousIoRule.ts
│   │   │   └── style/
│   │   │       ├── CyclomaticComplexityRule.ts
│   │   │       └── NamingConventionRule.ts
│   │   ├── IScanner.ts
│   │   ├── AnalysisEngine.ts
│   │   └── FindingAggregator.ts
│   ├── services/
│   │   ├── PrFileProvider.ts      ← wraps GitHub MCP client
│   │   ├── ReviewService.ts
│   │   └── WebhookService.ts
│   ├── db/
│   │   └── client.ts
│   ├── __fixtures__/
│   └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ReviewDetailPage.tsx
│   │   │   ├── ConfigurationPage.tsx
│   │   │   └── TeamManagementPage.tsx
│   │   ├── components/
│   │   │   ├── ReviewList.tsx
│   │   │   ├── FindingsBadge.tsx
│   │   │   └── SeverityChart.tsx
│   │   └── api/
│   │       └── client.ts
│   └── vite.config.ts
├── CLAUDE.md
├── README.md
├── docker-compose.yml
├── .env.example
└── package.json
```

### 5.4 README Requirements

The README must include:

1. **Project summary** — 2-sentence description
2. **Architecture diagram** — ASCII or image
3. **Prerequisites** — Node 20, Docker, GitHub App setup steps
4. **Quick start** — `git clone` → `docker compose up` → working app in 3 commands
5. **Environment variables** — table of all required vars with descriptions
6. **API documentation** — link to generated OpenAPI spec (`/api/docs`)
7. **Running tests** — `npm test`, `npm run test:coverage`
8. **MCP integration** — how to configure GitHub MCP for local use
9. **Security audit** — summary of self-audit results and accepted risks
10. **Phase completion checklist** — cross-reference to each spec phase

### 5.5 Delivery Checklist

Before final submission, verify every item:

- [ ] All 5 phases of this spec are implemented as described
- [ ] 9+ REST API endpoints functional and tested
- [ ] 5 database tables with correct relationships and migrations
- [ ] 6 React frontend components rendering real API data
- [ ] 80%+ test coverage (vitest coverage report screenshot)
- [ ] CI/CD pipeline green on `main` branch
- [ ] Security audit completed; zero unmitigated high/critical findings
- [ ] GitHub MCP server integrated and demonstrably called during PR analysis
- [ ] `CLAUDE.md` present with all custom commands documented
- [ ] CRISP prompting templates used and evidenced in development git history or prompt log
- [ ] Debugging strategy followed; no unresolved TODOs or commented-out debug code
- [ ] README complete per Section 5.4
- [ ] `.env.example` present with all required variables listed
- [ ] No `console.log`, hardcoded secrets, or TODO comments in production code

---

*End of Specification — CodeReview Bot v1.1 (Final)*
