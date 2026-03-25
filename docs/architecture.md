# Mav Architecture

## Monorepo Structure

```
mav/
├── apps/
│   ├── backend/           NestJS REST API (port 3000)
│   ├── frontend/          Next.js web UI (port 4200)
│   ├── orchestrator/      Temporal worker for background jobs
│   ├── agent-brain/       OODA loop decision engine
│   ├── mcp-server/        MCP protocol server (14 tools, 4 resources)
│   ├── cli/               Terminal interface
│   └── extension/         Browser extension (Skool integration)
│
├── libraries/
│   ├── nestjs-libraries/  Shared NestJS services, Prisma schema, integrations
│   ├── react-shared-libraries/  Shared React components, translations
│   ├── helpers/           Common utilities
│   ├── persona-engine/    Character/voice system
│   ├── compliance-engine/ Per-platform ToS enforcement
│   ├── approval-engine/   Human-in-the-loop queue
│   └── llm-adapter/       BYOK LLM integration (Vercel AI SDK)
│
├── docs/                  Architecture, design philosophy
├── SKILL.md               Agent instruction document
├── FORK.md                Fork provenance
└── docker-compose.*.yaml  Container orchestration
```

## Data Flow: Agent Decision to Published Post

```
Goal + Persona + Analytics
        │
        ▼
┌─────────────────────┐
│    OBSERVE           │  Gather: goals, trending topics, past performance,
│    (Temporal activity)│  content calendar gaps, platform constraints
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    ORIENT            │  LLM call (generateObject with Zod schema):
│    (LLM analysis)    │  Score topics, flag risks, identify opportunities
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    DECIDE            │  LLM call (structured output):
│    (Action plan)     │  Pick platforms, timing, topics, assign risk scores
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    ACT               │  For each action:
│    (Content pipeline)│
│                      │  1. Generate content via LLM (uses active persona)
│                      │  2. Platform-adapt (character limits, formatting)
│                      │  3. Compliance check (rate limit, bot label, risk)
│                      │  4. Submit to approval queue
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    APPROVAL QUEUE    │  Status: PENDING → APPROVED / REJECTED / EXPIRED
│                      │  Policy determines auto vs. manual review
└─────────┬───────────┘
          │ (on approve)
          ▼
┌─────────────────────┐
│    PUBLISH           │  Postiz scheduling engine handles:
│    (34+ platforms)   │  OAuth, media upload, platform API, retry
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    RECORD            │  AuditLog: timestamp, action, content hash,
│    (Audit trail)     │  compliance results, LLM cost, reasoning trace
└─────────────────────┘
```

## Module Boundaries

### Inherited from Postiz (AGPL-3.0)

- **Backend API** (`apps/backend`) — NestJS application. Controllers → Services → Repositories. All platform integrations live in `libraries/nestjs-libraries/src/integrations/`.
- **Frontend** (`apps/frontend`) — Next.js 14 with app router. SWR for data fetching. Tailwind CSS for styling.
- **Orchestrator** (`apps/orchestrator`) — Temporal worker that processes scheduled post publishing.
- **Prisma Schema** (`libraries/nestjs-libraries/src/database/prisma/schema.prisma`) — PostgreSQL. Extended with 7 new models for Mav.

### New Mav Modules (Apache-2.0 via API boundary)

- **Agent Brain** (`apps/agent-brain`) — OODA loop as Temporal workflow. Uses Vercel AI SDK for LLM calls. Communicates with backend via REST API.
- **MCP Server** (`apps/mcp-server`) — Thin wrapper over REST API. Each MCP tool maps to one REST endpoint. Uses `@modelcontextprotocol/sdk`.
- **Persona Engine** (`libraries/persona-engine`) — CRUD + `buildSystemPrompt()` + `buildFewShotExamples()`. Injected into LLM calls.
- **Compliance Engine** (`libraries/compliance-engine`) — `checkContent()`, `computeRiskScore()`, `checkRateLimit()`, `addBotLabel()`. Platform rules in `default-rules.ts`.
- **Approval Engine** (`libraries/approval-engine`) — `submit()`, `decide()`, `getPending()`, `getHistory()`, `expireStale()`. 5 policy types.
- **LLM Adapter** (`libraries/llm-adapter`) — Wraps Vercel AI SDK. BYOK via env vars. Supports Anthropic, OpenAI, Google, Ollama.

## API Contracts

### REST API (Backend)

All new endpoints are at `/public/v1/`:

| Endpoint | Method | Module |
|----------|--------|--------|
| `/public/v1/personas` | GET, POST | Persona |
| `/public/v1/personas/active` | GET, POST | Persona |
| `/public/v1/approvals/pending` | GET | Approval |
| `/public/v1/approvals/:id/decide` | POST | Approval |
| `/public/v1/approvals/history` | GET | Approval |
| `/public/v1/compliance/audit` | GET | Compliance |
| `/public/v1/brain/trigger` | POST | Brain |
| `/public/v1/brain/status` | GET | Brain |

Plus all existing Postiz endpoints for posts, integrations, analytics, upload.

### MCP Server

14 tools across 6 modules. See [SKILL.md](/SKILL.md) for the complete tool reference.

## Database

Prisma schema at `libraries/nestjs-libraries/src/database/prisma/schema.prisma`.

New models added by Mav:

| Model | Purpose |
|-------|---------|
| `Persona` | Voice/character definitions |
| `ApprovalItem` | Items in the approval queue |
| `ApprovalPolicy` | Per-org approval rules |
| `AuditLog` | Immutable action log with compliance results |
| `AgentSession` | Brain cycle execution records |
| `Goal` | Natural language goals with structured parsing |
| `ComplianceRule` | Per-platform posting rules |

## Deployment

### Development

```bash
docker compose -f docker-compose.dev.yaml up -d  # PostgreSQL, Redis, Temporal
pnpm install
pnpm prisma-db-push
pnpm dev-backend     # NestJS on :3000
pnpm dev-frontend    # Next.js on :4200
```

### Production

```bash
docker compose up -d  # All services including backend, frontend, orchestrator
```

Environment variables are documented in `.env.example`.
