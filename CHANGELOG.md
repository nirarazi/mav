# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [2.0.0] - 2026-03-25

Mav v2.0.0 — forked from Postiz v1.47.0. This is the first release of Mav as an autonomous social media platform.

### Added
- **Agent Brain** — OODA loop decision engine using Vercel AI SDK + Temporal workflows. Autonomously ideates, drafts, and schedules content.
- **Persona Engine** — Character/voice system. Define name, role, tone, topics, vocabulary, and example posts. Content generation inherits persona voice.
- **Compliance Engine** — Per-platform ToS rule enforcement. Character limits, rate limiting, bot labeling (conditional on approval policy), risk scoring, and full audit trail.
- **Approval Engine** — Human-in-the-loop approval queue with 5 policy types: ALWAYS_REQUIRE (default), ALWAYS_APPROVE, RISK_BASED, FIRST_N, SAMPLE.
- **MCP Server** — Model Context Protocol server with 14 tools and 4 resources. Connects any AI agent to Mav via stdio transport.
- **LLM Adapter** — BYOK (bring your own key) LLM integration via Vercel AI SDK. Supports Anthropic, OpenAI, Google, Ollama, and any OpenAI-compatible endpoint.
- **Public REST API** — New endpoints for personas, approvals, compliance audit, and brain operations at `/public/v1/`.
- **Agent Dashboard** — New home page with bento stats, activity feed, inline content generation, and time-of-day greeting.
- **Approval Queue UI** — Platform-faithful post previews (LinkedIn light, X dark), approve/reject with feedback, optimistic updates.
- **Persona Wizard** — 4-step creation flow: Identity, Voice & Tone, Content Rules, Review.
- **Agent Status Bar** — Persistent top bar showing agent state, active persona, pending count, pause/resume.
- **CLI Overhaul** — Beautiful terminal output with colors, spinners, tables. New commands for brain, approvals, personas, compliance, and status.
- **SKILL.md** — Comprehensive agent instruction document for MCP tool use.
- **Orbital Autonomy design system** — Light/purple theme (#FAFAF8 bg, #7C5CFC accent), DM Sans font, custom illustrations, micro-animations.
- **Micro-animations** — fadeInUp, scaleIn, slideInRight keyframes. Staggered card entries, hover lifts, press feedback across all components.

### Changed
- Full rebrand from Postiz to Mav across 433+ files
- All `@gitroom/` path aliases renamed to `@mav/`
- Docker services renamed from `postiz-*` to `mav-*`
- Root redirect changed from `/launches` to `/dashboard`
- Auth pages redesigned with animated orbital illustration
- Onboarding flow redesigned: Welcome → Connect → Ready with step-by-step guidance
- Sidebar navigation simplified: Dashboard, Review, Voices, Calendar, Analytics, Channels, Settings
- Theme locked to light mode (dark mode deferred to Phase 2)

### Fixed
- Safari localhost cookie issues documented (use Chrome for dev, Safari deferred to Phase 2)
- AI SDK version incompatibility (downgraded @ai-sdk/anthropic to v1.1.6 for SDK v4 compatibility)
- Node v24 OOM in Jest (added --max-old-space-size=4096, --runInBand)

## [1.47.0] - 2026-03-22

Fork point from [Postiz](https://github.com/gitroomhq/postiz-app).
See Postiz changelog for prior history.
