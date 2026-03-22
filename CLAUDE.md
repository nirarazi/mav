This project is Maverick, an autonomous social media management system for zero-human companies.
Forked from Postiz (v1.47.0). See FORK.md for fork details.

Maverick adds an autonomous agent brain, MCP server, persona engine, compliance engine,
and human-in-the-loop approval workflows on top of Postiz's 34+ platform integrations.

## Architecture

Monorepo with pnpm. Key folders:

### Core (inherited from Postiz, AGPL-3.0)
- `apps/backend` — NestJS REST API (port 3000)
- `apps/frontend` — Next.js web app (port 4200)
- `apps/orchestrator` — Temporal worker for background jobs
- `libraries/nestjs-libraries` — Shared NestJS services, Prisma schema, integrations
- `libraries/react-shared-libraries` — Shared React components
- `libraries/helpers` — Common utilities

### Maverick Additions (Apache 2.0 via API boundary)
- `apps/agent-brain` — OODA loop autonomous decision engine (Temporal workflows)
- `apps/mcp-server` — MCP protocol server for agent tool use
- `libraries/persona-engine` — Character/voice system for content generation
- `libraries/compliance-engine` — Per-platform ToS rules, rate limiting, audit trail
- `libraries/approval-engine` — Human-in-the-loop approval queue

## Rules

- Use only pnpm. Never install frontend components from npmjs.
- Backend layers: Controller → Service → Repository (no shortcuts)
- Frontend: Use SWR for data fetching via useFetch hook from @maverick/helpers
- Each SWR hook must be separate and comply with react-hooks/rules-of-hooks
- Tailwind 3 for styling. Check colors.scss, global.scss, tailwind.config.js first.
- All --color-custom* are deprecated. Don't use them.
- Linting runs only from root.
- Path aliases use @maverick/ prefix (e.g., @maverick/nestjs-libraries/*)
- Prisma schema at: libraries/nestjs-libraries/src/database/prisma/schema.prisma

## Maverick-Specific Patterns

- Agent brain uses Temporal workflows (not BullMQ) — see apps/agent-brain/src/brain.workflow.ts
- Approval items go through: submit → pending → approved/rejected/expired
- Compliance checks run BEFORE any content is published
- Every autonomous action must be logged to AuditLog
- Personas define voice, tone, vocabulary, and per-platform overrides
- MCP server delegates to backend REST API via HTTP client
