<p align="center">
  <img src="apps/frontend/public/logo.svg" width="80" alt="Mav Logo" />
</p>

<h1 align="center">Mav</h1>

<p align="center">
  <strong>Autonomous social media for zero-human companies</strong>
</p>

<p align="center">
  <a href="https://opensource.org/license/agpl-v3"><img src="https://img.shields.io/badge/License-AGPL%203.0-blue.svg" alt="License" /></a>
  <a href="https://www.npmjs.com/package/maverick"><img src="https://img.shields.io/npm/v/maverick.svg?color=7C5CFC" alt="npm" /></a>
</p>

<p align="center">
  An AI agent that observes, decides, drafts, and publishes your social media<br/>
  across 34+ platforms — with full compliance and human-in-the-loop approval.
</p>

---

## What is Mav?

Mav isn't a scheduling tool. It's an **autonomous agent** that manages your entire social media presence.

You give it a persona, connect your platforms, and set a goal. Mav's agent brain runs an OODA loop — observing your analytics, deciding what to post, drafting content in your voice, checking compliance, and queuing everything for your approval. When you're ready, it publishes.

Built for the era of zero-human companies, AI-first teams, and agent orchestration platforms.

## Key Capabilities

| Capability | What it does |
|-----------|-------------|
| **Agent Brain** | OODA loop that autonomously ideates, drafts, and schedules content |
| **34+ Platforms** | X, LinkedIn, Bluesky, Threads, Reddit, Instagram, TikTok, YouTube, and 26 more |
| **Persona Engine** | Define voice, tone, vocabulary, and topics — content matches your character |
| **Compliance Engine** | Per-platform rules: character limits, rate limits, bot labeling, risk scoring |
| **Human-in-the-Loop** | Every post reviewed before publishing. Trust earned progressively. |
| **MCP Server** | 14 tools for AI agents via Model Context Protocol |
| **CLI** | Beautiful terminal interface for both humans and agents |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  AI Agents (Claude, GPT, Gemini, Paperclip, etc.)    │
│         │                    │                        │
│    MCP Server            REST API                    │
│    (14 tools)         (source of truth)              │
└─────────┬────────────────────┬───────────────────────┘
          └──────────┬─────────┘
                     │
┌────────────────────┼─────────────────────────────────┐
│  Mav Core          │                                  │
│                    ▼                                  │
│  ┌─────────────────────────────────────────────┐     │
│  │           Agent Brain (OODA Loop)            │     │
│  │  Observe → Orient → Decide → Act → Record   │     │
│  └──────────────────┬──────────────────────────┘     │
│                     │                                 │
│  ┌─────────┐  ┌────┴─────┐  ┌──────────────┐        │
│  │ Persona │  │Compliance│  │   Approval   │        │
│  │ Engine  │  │  Engine   │  │    Queue     │        │
│  └─────────┘  └──────────┘  └──────┬───────┘        │
│                                     │                 │
│  ┌──────────────────────────────────┴──────────┐     │
│  │        Publishing Engine (34+ platforms)     │     │
│  └─────────────────────────────────────────────┘     │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │  Web UI      │  │     CLI      │                  │
│  │  (Next.js)   │  │  (Terminal)  │                  │
│  └──────────────┘  └──────────────┘                  │
└───────────────────────────────────────────────────────┘
```

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/maboroshi-inc/mav.git
cd mav
cp .env.example .env     # Edit with your settings
docker compose -f docker-compose.dev.yaml up -d
```

Open `http://localhost:4200` to access the web UI.

### CLI

```bash
npx maverick status
```

Set your API key and URL:

```bash
export MAVERICK_API_KEY=your-api-key
export MAVERICK_API_URL=http://localhost:3000
```

### MCP Server (for AI agents)

Add to your MCP client config:

```json
{
  "mcpServers": {
    "mav": {
      "command": "node",
      "args": ["path/to/mav/apps/mcp-server/dist/index.js"],
      "env": {
        "MAVERICK_API_KEY": "your-api-key",
        "MAVERICK_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

See [SKILL.md](SKILL.md) for the full agent instruction set.

## For AI Agents

Mav is built agent-first. The [SKILL.md](SKILL.md) file describes every MCP tool, resource, and workflow pattern an AI agent needs to manage a social media presence autonomously.

Connect via MCP to get 14 tools covering posts, integrations, approvals, personas, analytics, and brain operations.

## Tech Stack

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: Next.js + Tailwind CSS
- **Orchestration**: Temporal workflows
- **LLM**: Vercel AI SDK (BYOK — bring your own key)
- **Protocol**: REST API + MCP server
- **Build**: pnpm monorepo, tsup, Docker

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

## License

Mav core (forked from Postiz) is licensed under [AGPL-3.0](LICENSE).

New modules (agent-brain, mcp-server, persona-engine, compliance-engine, approval-engine) communicate via API boundaries and are licensed under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).

## Acknowledgments

Mav is forked from [Postiz](https://github.com/gitroomhq/postiz-app) v1.47.0. See [FORK.md](FORK.md) for details on the fork point and merge strategy.
