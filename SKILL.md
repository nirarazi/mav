# Mav — Agent Skill

> Autonomous social media management via MCP.
> Connect your AI agent to Mav to create, schedule, and publish content across 34+ platforms.

## What You Can Do

Mav gives you full control over a social media presence. You can:

- **Create posts** across any connected platform (X, LinkedIn, Bluesky, Threads, Reddit, and 30+ more)
- **Manage personas** that define voice, tone, and writing style for generated content
- **Review and approve** content before it goes live (human-in-the-loop)
- **Run strategy cycles** that analyze performance and generate content plans
- **Check compliance** against per-platform rules (character limits, rate limits, bot labeling)
- **View analytics** to understand what's working

## Core Workflow: OODA Loop

Mav's agent brain follows the OODA decision cycle:

```
OBSERVE  →  ORIENT  →  DECIDE  →  ACT
   ↑                                 |
   └─────────── RECORD ──────────────┘
```

1. **Observe** — Gather context: connected platforms, active persona, recent performance, pending approvals
2. **Orient** — Analyze gaps: what topics are trending, which platforms need content, what's the posting frequency goal
3. **Decide** — Choose actions: which platforms to target, what content themes, what timing
4. **Act** — Generate content, run compliance checks, submit for approval or publish

## MCP Tools Reference

### Posts

| Tool | Description |
|------|-------------|
| `create_post` | Create and schedule a post. Params: `content`, `platforms` (integration IDs), `scheduleAt` (ISO date), `mediaUrls`, `personaId`. Content goes through compliance automatically. |
| `list_posts` | Query posts by `status` (draft/scheduled/published), `from`/`to` dates, `platform`. Returns array with engagement metrics. |
| `delete_post` | Delete a scheduled or draft post by ID. |

### Integrations

| Tool | Description |
|------|-------------|
| `list_integrations` | Get all connected social accounts. Returns ID, platform name, account handle, and status for each. |
| `get_integration_settings` | Get platform-specific rules for an integration: max character length, supported media types, rate limits, required fields. **Always check this before creating a post.** |

### Approvals

| Tool | Description |
|------|-------------|
| `get_pending_approvals` | List items awaiting human review. Returns ID, content preview, platform, risk score, and submission date. |
| `approve_item` | Approve or reject an item. Params: `id`, `approved` (boolean), `feedback` (optional string). |

### Personas

| Tool | Description |
|------|-------------|
| `set_persona` | Switch the active persona by ID. All subsequent content generation uses this persona's voice. |
| `create_persona` | Define a new persona. Params: `name`, `role`, `tone` (array), `topics` (array), `vocabulary`, `examplePosts`. |

### Analytics

| Tool | Description |
|------|-------------|
| `get_analytics` | Engagement metrics per platform or post. Params: `integrationId` or `postId`, optional `date` range. |
| `get_brand_sentiment` | Sentiment analysis across platforms. Params: `platform`, `timeframe`. |

### Brain

| Tool | Description |
|------|-------------|
| `run_strategy_cycle` | Trigger one full OODA brain cycle. The brain observes current state, generates content ideas, drafts posts, runs compliance, and queues for approval. Returns a summary of actions taken. |
| `get_compliance_report` | Audit trail of all agent actions with timestamps, compliance check results, and cost tracking. |

## MCP Resources

| Resource URI | Description |
|-------------|-------------|
| `persona://current` | The currently active persona configuration (name, tone, topics, vocabulary) |
| `analytics://dashboard` | Aggregated metrics across all platforms |
| `compliance://rules/{platform}` | Platform-specific posting rules and constraints |
| `queue://approvals` | Count and summary of pending approval items |

## Common Workflows

### Post to a Platform

```
1. list_integrations          → Find the integration ID for target platform
2. get_integration_settings   → Check character limits, media rules, rate limits
3. create_post                → Submit content with integration ID and schedule time
   → Content automatically goes through compliance checks
   → If approval is required, it enters the queue
4. get_pending_approvals      → Check if the post needs human review
```

### Run an Autonomous Strategy

```
1. run_strategy_cycle         → Brain analyzes everything and generates content
   → Observes: goals, analytics, calendar gaps, trending topics
   → Orients: scores topics against persona and goals
   → Decides: picks platforms, timing, content themes
   → Acts: generates drafts, runs compliance, queues for approval
2. get_pending_approvals      → Review what the brain generated
3. approve_item               → Approve or reject each item with feedback
```

### Check What Needs Attention

```
1. get_pending_approvals      → See what's waiting for review
2. get_analytics              → Check recent performance
3. get_compliance_report      → Review audit trail for issues
```

### Switch Voice

```
1. create_persona             → Define a new voice (or use existing)
2. set_persona                → Activate it
3. create_post                → Content now uses the new voice
```

## Rules and Constraints

- **Compliance is automatic.** Every post goes through the compliance engine before publishing. You don't need to check compliance manually — it happens inside `create_post` and `run_strategy_cycle`.
- **Approval is required by default.** Posts enter the approval queue unless the organization has opted into auto-approve mode. Check `get_pending_approvals` to see what needs human review.
- **Always check integration settings first.** Each platform has different character limits, media requirements, and rate limits. Call `get_integration_settings` before crafting content for a new platform.
- **Personas are sticky.** Once set, the active persona applies to all content generation until changed. Check `persona://current` to see what's active.
- **Rate limits are per-platform.** The compliance engine enforces per-platform posting frequency. If you hit a limit, the post will be deferred automatically.
- **Bot labeling is conditional.** When the organization runs in full autopilot mode (no human approval), the compliance engine auto-adds bot disclosure labels per platform ToS. When human-in-the-loop is active, no bot label is needed.

## Configuration

Connect to Mav via MCP:

```json
{
  "mcpServers": {
    "mav": {
      "command": "node",
      "args": ["path/to/mav/apps/mcp-server/dist/index.js"],
      "env": {
        "MAV_API_KEY": "your-api-key",
        "MAV_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

Or use the CLI:

```bash
export MAV_API_KEY=your-api-key
export MAV_API_URL=http://localhost:3000
npx mav status
```
