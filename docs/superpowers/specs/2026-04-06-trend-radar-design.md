# Trend Radar + Newsjacking

External awareness engine that monitors trending topics, industry news, and keyword signals across platforms. Surfaces relevant opportunities and auto-drafts time-sensitive content for newsjacking. Frequency is automatically tuned to the user's AI budget.

## Sources

Three source types, each with different cost profiles and check frequencies:

### Keyword Monitoring
- User-configured keywords tracked across connected platforms
- Catches: brand mentions, competitor activity, industry terms
- Default frequency: every 10-15 min
- Cost: low (API calls only, no LLM needed for detection)

### Platform Trending
- Trending topics and hashtags on each connected platform
- Catches: viral moments, cultural events, breaking news relevant to persona
- Default frequency: every 1-2h
- Cost: low-medium (API calls + LLM relevance scoring)

### RSS Feeds
- User-configured feeds for industry news, competitor blogs, publications
- Catches: industry news, thought leadership opportunities, competitor moves
- Default frequency: every 4-6h
- Cost: low (HTTP fetch + LLM relevance scoring)

## Signal Filtering

Every raw signal passes through a three-factor filter before surfacing:

### Relevance (weight: 0.4)
Score the signal against the persona's topics, the user's goals, and the keyword config. Uses LLM to assess semantic relevance, not just keyword matching. Signals about topics the persona covers score high; tangential topics score low.

### Timing (weight: 0.35)
How fresh and fast-moving is this signal? Factors:
- Recency: when did it start trending?
- Velocity: how fast is it growing?
- Decay: signals lose timing score over hours. A trend from 6 hours ago is less valuable than one from 30 minutes ago.

### Saturation (weight: 0.25, inverted)
Has the agent already posted about this? Is the platform flooded with takes? Factors:
- Agent's recent posts on this topic (last 48h)
- Volume of content on the platform about this topic (estimated from trending data)
- Penalty for pile-on: if saturation is high, even relevant + timely signals get suppressed

### Combined Opportunity Score

```
opportunityScore = relevance(0.4) × timing(0.35) × (1 - saturation)(0.25)
```

- Score > 0.8: breaking/viral — auto-draft
- Score 0.5-0.8: trending/noteworthy — surface as opportunity
- Score < 0.5: discard

## Action Tiers

### Breaking / Viral (score > 0.8, high timing velocity)
- Auto-draft immediately via content pipeline
- Submit to approval queue with `time-sensitive` flag
- Dashboard notification with urgency indicator
- Approval queue shows countdown: "Relevance decays in ~2h"

### Trending (score 0.6-0.8)
- Surface as opportunity in dashboard radar feed
- Include: topic summary, why it's relevant, suggested angle, which platforms
- Queue for next OODA cycle — the Orient phase picks it up and factors it into content strategy
- No draft generated unless the user or brain explicitly acts on it

### Noteworthy (score 0.5-0.6)
- Log to radar feed for context
- Orient phase can reference it but no action triggered
- Useful for pattern recognition over time ("AI regulation has been trending 3 times this month")

## Budget-Driven Frequency Tuning

Instead of configuring poll intervals directly, users set a monthly AI budget. The system automatically allocates across all Mav features and adjusts radar frequency accordingly.

### How It Works

User sets one number: monthly AI budget (e.g., $50/month).

The system allocates across three buckets:
- **Content generation** (posts, drafts, learning loop evaluations)
- **Engagement** (response drafting, sentiment analysis)
- **Trend radar** (relevance scoring, auto-drafts)

### Auto-Tuning Rules

Higher budget:
- Keyword monitoring: every 10 min
- Platform trending: every 1h
- RSS feeds: every 4h
- Auto-draft threshold: 0.8
- More auto-drafts generated

Lower budget:
- Keyword monitoring: every 30 min
- Platform trending: every 4h
- RSS feeds: every 6h
- Auto-draft threshold: 0.85 (fewer drafts, only highest-value)
- Learning mode may downgrade from Standard to Lite

### Transparency

Users see:
- Current budget allocation breakdown (pie chart / bar)
- Projected vs actual spend this month
- How frequency would change at different budget levels
- Manual override sliders to reallocate between buckets (e.g., "more radar, less content gen")

### Budget Allocation Model

```
BudgetConfig {
  orgId               String
  monthlyBudgetUsd    Float
  allocationOverride  Json?    // null = auto, or { contentGen: 0.4, engagement: 0.35, radar: 0.25 }
  currentSpendUsd     Float    // updated after each LLM call
  updatedAt           DateTime
}
```

Default auto-allocation: 40% content generation, 35% engagement, 25% radar. Adjusts dynamically — if engagement volume is low, reallocate surplus to radar or content.

## Setup: Wizard to Manual

### Step 1: Auto-Generated from Persona (zero-config start)

When a user creates a persona, the radar auto-configures:
- Persona topics → keyword watchlist (e.g., topics ["AI", "automation"] → keywords ["artificial intelligence", "AI agents", "automation tools"])
- Persona industry → suggested RSS feeds (curated list per industry, user confirms)
- Connected platforms → trending sources enabled automatically

The radar is working within seconds of persona creation.

### Step 2: Refine in Settings

Power users can customize:
- Add/remove keywords and keyword groups
- Add custom RSS feed URLs
- Set competitor handles to watch (cross-referenced with keyword monitoring)
- Adjust relevance threshold (default 0.5, raise to reduce noise)
- Override budget allocation between features
- Mute specific topics ("I know about X, stop surfacing it")

## Deduplication and Merging

The same event often appears across multiple sources (keyword hit + trending + RSS article). The radar deduplicates:
- Cluster signals by topic similarity (LLM-based semantic clustering)
- Merge into a single `TrendSignal` with the highest opportunity score
- Track which sources contributed (useful for source quality evaluation)

## Data Model

### TrendSignal

```
TrendSignal {
  id               String   @id
  orgId            String
  topic            String   // normalized topic label
  summary          String   // LLM-generated 1-2 sentence summary
  sources          Json     // [{ type: "keyword"|"trending"|"rss", platform?, url?, raw }]
  relevanceScore   Float    // 0-1
  timingScore      Float    // 0-1
  saturationScore  Float    // 0-1
  opportunityScore Float    // combined
  tier             Enum     // BREAKING, TRENDING, NOTEWORTHY
  status           Enum     // NEW, ACTED_ON, DISMISSED, EXPIRED
  suggestedAngle   String?  // LLM-suggested content angle
  suggestedPlatforms String[] // which platforms this is relevant for
  draftId          String?  // links to ApprovalItem if auto-drafted
  detectedAt       DateTime
  expiresAt        DateTime // opportunity score decay — auto-expire after relevance drops
}
```

### RadarConfig

```
RadarConfig {
  orgId            String
  keywords         String[]     // watchlist
  rssFeedUrls      String[]     // feed URLs
  competitorHandles Json        // { platform: handle[] }
  relevanceThreshold Float      // default 0.5
  mutedTopics      String[]     // topics to suppress
  updatedAt        DateTime
}
```

### BudgetConfig

```
BudgetConfig {
  orgId               String
  monthlyBudgetUsd    Float
  allocationOverride  Json?    // null = auto, or { contentGen: float, engagement: float, radar: float }
  currentSpendUsd     Float
  projectedSpendUsd   Float    // estimated end-of-month based on current rate
  updatedAt           DateTime
}
```

## API Endpoints

```
GET    /public/v1/radar                      // current signals (filters: tier, platform, status)
GET    /public/v1/radar/:id                  // signal detail
POST   /public/v1/radar/:id/act             // trigger draft from a signal
POST   /public/v1/radar/:id/dismiss         // dismiss a signal
POST   /public/v1/radar/:id/mute-topic      // mute this topic going forward
GET    /public/v1/radar/config              // get radar config (keywords, feeds, etc.)
PUT    /public/v1/radar/config              // update radar config
GET    /public/v1/budget                    // current budget allocation and spend
PUT    /public/v1/budget                    // update budget
GET    /public/v1/budget/projection         // projected spend and frequency at current rate
```

## MCP Tools

```
get_trend_signals        // current radar signals, filterable by tier
act_on_signal            // draft content from a signal
dismiss_signal           // mark signal as not relevant
get_radar_config         // current keyword/RSS/competitor config
update_radar_config      // modify watchlist
get_budget_status        // current spend vs budget
```

## Integration with Existing Systems

- **Brain OODA Loop**: The Observe phase reads active trend signals. The Orient phase evaluates them against goals and playbook. The Decide phase may choose to act on a trending signal instead of (or in addition to) planned content.
- **Content Pipeline**: Auto-drafted posts from breaking signals flow through the same pipeline: persona → LLM → compliance → approval. The signal's `suggestedAngle` is passed as context to the LLM.
- **Approval Engine**: Time-sensitive drafts use a new flag `timeSensitive: true` which surfaces them at the top of the queue with a relevance decay countdown.
- **Performance Learning Loop**: Posts generated from trend signals are tagged with `source: "trend_radar"` and `signalId`. The playbook learns which types of trend-based content perform well ("newsjacking works for you on X but not LinkedIn").
- **Engagement Autopilot**: Keyword monitoring overlaps with engagement discovery. Shared deduplication ensures a mention isn't processed as both an engagement and a trend signal. Keyword hits that are direct mentions → Engagement Autopilot. Keyword hits that are general topic discussion → Trend Radar.
- **Compliance Engine**: All auto-drafted content passes compliance checks. Additional radar-specific rule: no automated posting about sensitive breaking news (natural disasters, tragedies, etc.) without human approval, regardless of graduation status.
- **Budget System**: Budget is global across all three features. The budget controller tracks spend per feature and adjusts frequencies in real-time. If the month's budget is 80% consumed by the 15th, all frequencies are reduced for the remainder of the month.
