# Mav Fork Information

**Forked from**: [Postiz](https://github.com/gitroomhq/postiz-app)
**Fork version**: v1.47.0
**Fork date**: 2026-03-22
**License**: AGPL-3.0 (inherited from Postiz)

## What is Mav?

Mav is an autonomous social media management system for zero-human companies, built on top of Postiz's excellent platform integration foundation.

## Fork Strategy

- **Modified files** (will diverge from upstream): `schema.prisma`, `app.module.ts`, `social.abstract.ts`, all frontend pages
- **Merge strategy**: Cherry-pick security fixes and new platform integrations from upstream. No rebasing.
- **Contributions back**: Bug fixes and non-agent features contributed upstream.

## New Modules (Apache 2.0 via API boundary)

- `apps/agent-brain/` — Autonomous content generation (Vercel AI SDK + Temporal)
- `apps/mcp-server/` — MCP wrapper over REST API
- `libraries/compliance-engine/` — Per-platform ToS rules and audit trail
- `libraries/approval-engine/` — Human-in-the-loop approval workflows
