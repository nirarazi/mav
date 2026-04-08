# Engagement Autopilot

Autonomous social engagement with graduated trust and tiered autonomy. Turns Mav from a content publisher into an active social presence that monitors, responds, and participates across all connected platforms.

## Engagement Tiers

Five tiers ordered from low-risk to high-risk. Each tier has independent autonomy graduation per platform.

| Tier | Actions | Response Target | Examples |
|------|---------|-----------------|----------|
| 1. Passive | Likes, reacts, reposts | Batched (1-2h) | Like a mention, retweet a compliment |
| 2. Acknowledgment | Thank-yous, emoji replies, simple praise | Timely (5-30 min) | "Thanks for sharing!", heart emoji reply |
| 3. Conversational | Substantive replies, answering questions | Timely (5-30 min) | Answering a product question in a thread |
| 4. Proactive | Quote tweets, joining threads, initiating | Batched (1-2h) | Quote-tweeting a relevant industry take |
| 5. Sensitive | Complaints, negative sentiment, DMs | Real-time (<5 min) | Responding to a frustrated user's complaint |

## Trust Graduation System

Graduation is **per-platform, per-tier**. The agent can be autonomous for likes on X but still supervised for replies on LinkedIn.

### States

- **Supervised**: Every action queued for approval. Agent is learning.
- **Graduating**: Tracking approval rate over a rolling window of 20 actions.
- **Autonomous**: Acts independently. Monitored for regression.

### Transitions

- **Supervised → Autonomous**: Approval rate reaches 95% over the last 20 actions in that tier+platform combination.
- **Autonomous → Supervised**: Approval rate drops below 90% over the last 20 actions (regression). This can happen if a human retroactively rejects auto-sent responses.
- A new platform always starts at Supervised for all tiers.
- A new tier always starts at Supervised across all platforms.

### Data Model

```
EngagementAutonomy {
  orgId        String
  platform     String    // "x", "linkedin", "bluesky", etc.
  tier         Int       // 1-5
  status       Enum      // SUPERVISED, GRADUATING, AUTONOMOUS
  window       Json      // rolling array of last 20 outcomes {approved: bool, timestamp}
  approvalRate Float     // computed: approved / total in window
  graduatedAt  DateTime? // when it last transitioned to AUTONOMOUS
  regressedAt  DateTime? // when it last regressed to SUPERVISED
}
```

## Uncertainty Handling

The agent assigns a confidence score (0-1) to each drafted response based on persona coverage, sentiment clarity, and topic familiarity.

| Confidence | Action |
|------------|--------|
| >= 70% | Act normally (auto-send if graduated, queue if supervised) |
| 40-70% | Draft best-effort response, flag as low-confidence, always escalate to approval queue regardless of graduation status |
| < 40% | Skip entirely. Log as "missed engagement" in dashboard for human review. Never send a bad response. |

## Engagement Discovery

### v1: Polling via Temporal

Temporal scheduled workflows poll platform APIs for new mentions, comments, replies, and DMs. Poll frequency is driven by tier response targets:

- Sensitive tier: poll every 2-3 min
- Acknowledgment + Conversational: poll every 10-15 min
- Passive + Proactive: poll every 30-60 min

Smart frequency adjustment: if an account has high activity, increase poll rate. If quiet, decrease to save API quota.

Deduplication: track last-seen engagement ID per platform to avoid processing the same item twice.

### v2: Webhooks

Add webhook receivers where platforms support them (X, LinkedIn, Discord, Slack, etc.). Fall back to polling for platforms without webhook support. Webhook events feed into the same engagement processing pipeline.

## Data Flow

```
Platform APIs
  → Engagement Monitor (Temporal workflow, polls or receives webhooks)
  → Classify: assign tier (1-5) + sentiment + confidence score
  → Persona Engine: draft response using engagement-specific persona fields
  → Compliance Engine: check response against platform rules
  → Graduation check:
      - If autonomous for this tier+platform AND confidence >= 70%: auto-send
      - If supervised OR confidence 40-70%: submit to approval queue
      - If confidence < 40%: skip and log
  → On send: log to AuditLog (action: ENGAGEMENT_REPLY, tier, confidence, platform)
  → Update graduation window with outcome
```

## Persona Engine Extensions

The current persona covers publishing voice. Engagement requires six additional fields:

### New Persona Fields

**replyStyle** (string): How the persona speaks in replies vs posts. Replies are typically shorter, more casual, and more direct than published content.
- Example: "Casual and warm. Use first names when known. Keep replies under 280 chars even on platforms that allow more. Match the energy of the person you're replying to."

**engagementExamples** (object): Few-shot examples of ideal responses per tier. These are critical for LLM quality — the more examples, the better the agent performs.
```json
{
  "acknowledgment": [
    { "incoming": "Love this post!", "response": "Glad it resonated! What part stuck with you?" }
  ],
  "conversational": [
    { "incoming": "How does X compare to Y?", "response": "Great question..." }
  ],
  "sensitive": [
    { "incoming": "Your product broke my workflow", "response": "That's frustrating, sorry..." }
  ]
}
```

**boundaries** (string[]): Topics the agent must never engage on. Any incoming engagement touching these topics gets classified as confidence < 40% and skipped.
- Example: `["politics", "competitor comparisons", "pricing specifics", "legal matters", "internal roadmap"]`

**escalationPhrases** (string[]): Keywords or patterns that always force escalation to the approval queue, regardless of graduation status or confidence.
- Example: `["lawsuit", "legal", "CEO", "refund", "cancel subscription", "data breach"]`

**complaintPlaybook** (string): Step-by-step guidance for handling negative sentiment. Used as part of the LLM system prompt when generating sensitive-tier responses.
- Example: "1. Acknowledge the issue without being defensive. 2. Empathize with their frustration. 3. Offer a concrete next step. 4. If complex, invite them to DM. Never say 'sorry for the inconvenience' — be specific about what went wrong."

**proactiveRules** (string): When and how to initiate engagement. Governs tier 4 behavior.
- Example: "Join threads about [AI, autonomous systems, social media automation]. Add genuine value — share a perspective or ask a question. Never self-promote unprompted. Maximum 5 proactive engagements per day per platform."

### Persona Guidance for Users

Creating a persona that works well for engagement requires more specificity than publishing. The persona wizard should guide users through:

1. **Voice calibration**: "How would your brand reply to a compliment? A question? A complaint?" — collect 3-5 example replies per scenario.
2. **Boundary setting**: "What topics should the agent never touch?" — present common categories (politics, competitors, pricing, legal) as checkboxes plus free-text.
3. **Escalation triggers**: "What words or situations should always go to a human?" — provide defaults, let users add their own.
4. **Complaint handling**: "Walk us through how you'd handle an angry customer in 4 steps" — structured form that becomes the playbook.
5. **Proactive rules**: "Should the agent join conversations? If so, about what topics? How many per day?" — with clear defaults.

All engagement persona fields are optional. The agent falls back to the base persona voice if not configured, but engagement quality improves dramatically with them. The dashboard should surface a "persona completeness" score that encourages users to fill in engagement fields.

## New Database Models

### Engagement

```
Engagement {
  id            String   @id
  orgId         String
  platform      String
  externalId    String   // platform's ID for this mention/comment/reply
  type          Enum     // MENTION, REPLY, COMMENT, DM, QUOTE
  tier          Int      // 1-5, classified by the agent
  incomingText  String
  authorName    String
  authorHandle  String
  sentiment     Float    // -1 to 1
  confidence    Float    // 0 to 1
  status        Enum     // PENDING, RESPONDED, SKIPPED, ESCALATED
  responseText  String?  // drafted response (null if skipped)
  respondedAt   DateTime?
  approvalId    String?  // links to ApprovalItem if escalated
  createdAt     DateTime
}
```

### MissedEngagement (for < 40% confidence skips)

Tracked via `Engagement` with status `SKIPPED`. Surfaced in dashboard with "teach the agent" action — user provides ideal response, which gets added to `engagementExamples`.

## API Endpoints

```
POST   /public/v1/engagements/poll          // manually trigger a poll cycle
GET    /public/v1/engagements               // list engagements (filters: platform, tier, status, date range)
GET    /public/v1/engagements/missed        // list skipped engagements for review
POST   /public/v1/engagements/:id/teach     // provide ideal response for a missed engagement
GET    /public/v1/engagements/autonomy      // graduation status per platform+tier
PUT    /public/v1/engagements/autonomy      // manually override graduation status
GET    /public/v1/engagements/stats         // response times, volumes, approval rates
```

## MCP Tools

```
get_engagement_queue     // pending engagements needing response
respond_to_engagement    // draft or send a response
get_missed_engagements   // skipped items for review
get_autonomy_status      // graduation status across platforms
override_autonomy        // manually promote/demote a tier+platform
```

## Integration with Existing Systems

- **Approval Engine**: Engagement responses use the existing approval queue with a new type `ENGAGEMENT_REPLY`. Approval/rejection outcomes feed back into the graduation window.
- **Compliance Engine**: All drafted responses pass through compliance checks before sending. Engagement-specific rules: no automated DM spam, respect per-platform reply rate limits.
- **Audit Log**: Every engagement action (respond, skip, escalate) is logged with tier, confidence, platform, and whether it was auto-sent or human-approved.
- **Brain OODA Loop**: The Observe phase gains engagement metrics (response volume, sentiment trends, missed engagement count). The Orient phase factors engagement health into strategy.
