# Engagement Autopilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an autonomous engagement system that monitors mentions/replies/comments across platforms, drafts responses using the persona engine, routes through compliance and approval, and graduates from supervised to autonomous based on approval rate.

**Architecture:** Two new Prisma models (Engagement, EngagementAutonomy). A new library `libraries/engagement-engine` houses the core services (EngagementService, GraduationService, EngagementPipeline). A Temporal workflow in the orchestrator polls platforms periodically. Backend REST API exposes endpoints. MCP tools delegate to the API. Frontend adds an engagement queue page.

**Tech Stack:** Prisma, NestJS, Temporal, SWR/React, MCP SDK, zod

**Spec:** `docs/superpowers/specs/2026-04-06-engagement-autopilot-design.md`

---

### Task 1: Prisma Schema — Engagement & EngagementAutonomy Models

**Files:**
- Modify: `libraries/nestjs-libraries/src/database/prisma/schema.prisma`

- [ ] **Step 1: Add EngagementType and EngagementStatus enums**

Add after the existing `AgentSessionStatus` enum at line 1154:

```prisma
enum EngagementType {
  MENTION
  REPLY
  COMMENT
  DM
  QUOTE
}

enum EngagementStatus {
  PENDING
  RESPONDED
  SKIPPED
  ESCALATED
}

enum AutonomyStatus {
  SUPERVISED
  GRADUATING
  AUTONOMOUS
}
```

- [ ] **Step 2: Add Engagement model**

Add after the `ComplianceRule` model (after line 1112):

```prisma
model Engagement {
  id            String           @id @default(uuid())
  organizationId String
  platform      String
  externalId    String
  type          EngagementType
  tier          Int              // 1-5
  incomingText  String
  authorName    String
  authorHandle  String
  sentiment     Float            @default(0) // -1 to 1
  confidence    Float            @default(0) // 0 to 1
  status        EngagementStatus @default(PENDING)
  responseText  String?
  respondedAt   DateTime?
  approvalId    String?
  createdAt     DateTime         @default(now())

  organization  Organization     @relation(fields: [organizationId], references: [id])
  approvalItem  ApprovalItem?    @relation(fields: [approvalId], references: [id])

  @@unique([organizationId, platform, externalId])
  @@index([organizationId])
  @@index([status])
  @@index([platform])
  @@index([tier])
  @@index([createdAt])
}
```

- [ ] **Step 3: Add EngagementAutonomy model**

```prisma
model EngagementAutonomy {
  id           String         @id @default(uuid())
  organizationId String
  platform     String
  tier         Int            // 1-5
  status       AutonomyStatus @default(SUPERVISED)
  window       Json           @default("[]") // rolling array of last 20 outcomes [{approved: bool, timestamp}]
  approvalRate Float          @default(0)
  graduatedAt  DateTime?
  regressedAt  DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  organization Organization   @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, platform, tier])
  @@index([organizationId])
}
```

- [ ] **Step 4: Add engagement relation to ApprovalItem**

In the `ApprovalItem` model, add after the `agentSession` relation (line ~1003):

```prisma
  engagements  Engagement[]
```

- [ ] **Step 5: Add `ENGAGEMENT_REPLY` to ApprovalType enum**

```prisma
enum ApprovalType {
  POST
  REPLY
  CAMPAIGN
  PERSONA_CHANGE
  GOAL_CHANGE
  ENGAGEMENT_REPLY
}
```

- [ ] **Step 6: Add engagement persona fields to Persona model**

Add these fields after `platformOverrides` (line 971):

```prisma
  replyStyle         String?
  engagementExamples Json?    // { acknowledgment: [{incoming, response}], conversational: [...], sensitive: [...] }
  boundaries         String[] @default([])
  escalationPhrases  String[] @default([])
  complaintPlaybook  String?
  proactiveRules     String?
```

- [ ] **Step 7: Add Engagement and EngagementAutonomy relations to Organization**

Find the Organization model and add:

```prisma
  engagements         Engagement[]
  engagementAutonomies EngagementAutonomy[]
```

- [ ] **Step 8: Generate Prisma migration**

Run: `cd libraries/nestjs-libraries && npx prisma migrate dev --name add-engagement-models`
Expected: Migration created successfully

- [ ] **Step 9: Commit**

```bash
git add libraries/nestjs-libraries/src/database/prisma/
git commit -m "feat(schema): add Engagement and EngagementAutonomy models"
```

---

### Task 2: Engagement Engine Library — Graduation Service

**Files:**
- Create: `libraries/engagement-engine/src/graduation.service.ts`
- Create: `libraries/engagement-engine/src/graduation.interface.ts`
- Create: `libraries/engagement-engine/src/__tests__/graduation.service.test.ts`
- Create: `libraries/engagement-engine/package.json`
- Create: `libraries/engagement-engine/tsconfig.json`
- Create: `libraries/engagement-engine/jest.config.ts`
- Create: `libraries/engagement-engine/src/index.ts`

- [ ] **Step 1: Scaffold the library**

Create `libraries/engagement-engine/package.json`:

```json
{
  "name": "@mav/engagement-engine",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

Create `libraries/engagement-engine/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Create `libraries/engagement-engine/jest.config.ts`:

```typescript
export default {
  displayName: 'engagement-engine',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: '../../coverage/libraries/engagement-engine',
  moduleNameMapper: {
    '^@mav/nestjs-libraries/(.*)$': '<rootDir>/../nestjs-libraries/src/$1',
  },
};
```

- [ ] **Step 2: Create graduation interfaces**

Create `libraries/engagement-engine/src/graduation.interface.ts`:

```typescript
export interface GraduationWindow {
  approved: boolean;
  timestamp: string; // ISO date
}

export interface AutonomyState {
  organizationId: string;
  platform: string;
  tier: number;
  status: 'SUPERVISED' | 'GRADUATING' | 'AUTONOMOUS';
  approvalRate: number;
  windowSize: number;
  graduatedAt: string | null;
  regressedAt: string | null;
}

export const GRADUATION_THRESHOLD = 0.95; // 95% approval rate to graduate
export const REGRESSION_THRESHOLD = 0.90; // Drop below 90% to regress
export const WINDOW_SIZE = 20;
```

- [ ] **Step 3: Write failing tests for GraduationService**

Create `libraries/engagement-engine/src/__tests__/graduation.service.test.ts`:

```typescript
import { GraduationService } from '../graduation.service';
import { GRADUATION_THRESHOLD, REGRESSION_THRESHOLD, WINDOW_SIZE } from '../graduation.interface';

function buildPrisma() {
  return {
    engagementAutonomy: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
  } as any;
}

function makeAutonomy(overrides: Record<string, unknown> = {}) {
  return {
    id: 'auto-1',
    organizationId: 'org-1',
    platform: 'x',
    tier: 1,
    status: 'SUPERVISED',
    window: [],
    approvalRate: 0,
    graduatedAt: null,
    regressedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('GraduationService', () => {
  describe('recordOutcome()', () => {
    it('appends outcome to the rolling window', async () => {
      const prisma = buildPrisma();
      const existing = makeAutonomy({ window: [] });
      prisma.engagementAutonomy.findUnique.mockResolvedValue(existing);
      prisma.engagementAutonomy.upsert.mockImplementation(({ create, update }: any) =>
        Promise.resolve({ ...existing, ...(existing ? update : create) })
      );

      const service = new GraduationService(prisma);
      await service.recordOutcome('org-1', 'x', 1, true);

      expect(prisma.engagementAutonomy.upsert).toHaveBeenCalled();
      const call = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      const updatedWindow = JSON.parse(JSON.stringify(call.update.window));
      expect(updatedWindow).toHaveLength(1);
      expect(updatedWindow[0].approved).toBe(true);
    });

    it('trims window to last 20 entries', async () => {
      const prisma = buildPrisma();
      const fullWindow = Array.from({ length: 20 }, (_, i) => ({
        approved: true,
        timestamp: new Date(2026, 0, i + 1).toISOString(),
      }));
      const existing = makeAutonomy({ window: fullWindow });
      prisma.engagementAutonomy.findUnique.mockResolvedValue(existing);
      prisma.engagementAutonomy.upsert.mockImplementation(({ update }: any) =>
        Promise.resolve({ ...existing, ...update })
      );

      const service = new GraduationService(prisma);
      await service.recordOutcome('org-1', 'x', 1, false);

      const call = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      const updatedWindow = call.update.window;
      expect(updatedWindow).toHaveLength(WINDOW_SIZE);
      expect(updatedWindow[updatedWindow.length - 1].approved).toBe(false);
    });

    it('graduates to AUTONOMOUS when approval rate hits 95%', async () => {
      const prisma = buildPrisma();
      const window19Approved = Array.from({ length: 19 }, () => ({
        approved: true,
        timestamp: new Date().toISOString(),
      }));
      const existing = makeAutonomy({ window: window19Approved, status: 'SUPERVISED' });
      prisma.engagementAutonomy.findUnique.mockResolvedValue(existing);
      prisma.engagementAutonomy.upsert.mockImplementation(({ update }: any) =>
        Promise.resolve({ ...existing, ...update })
      );

      const service = new GraduationService(prisma);
      const result = await service.recordOutcome('org-1', 'x', 1, true);

      const call = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      expect(call.update.status).toBe('AUTONOMOUS');
      expect(call.update.graduatedAt).toBeDefined();
    });

    it('regresses to SUPERVISED when approval rate drops below 90%', async () => {
      const prisma = buildPrisma();
      const window = [
        ...Array.from({ length: 17 }, () => ({ approved: true, timestamp: new Date().toISOString() })),
        ...Array.from({ length: 2 }, () => ({ approved: false, timestamp: new Date().toISOString() })),
      ];
      const existing = makeAutonomy({ window, status: 'AUTONOMOUS' });
      prisma.engagementAutonomy.findUnique.mockResolvedValue(existing);
      prisma.engagementAutonomy.upsert.mockImplementation(({ update }: any) =>
        Promise.resolve({ ...existing, ...update })
      );

      const service = new GraduationService(prisma);
      // Adding a 3rd rejection: 17/20 = 85% < 90%
      await service.recordOutcome('org-1', 'x', 1, false);

      const call = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      expect(call.update.status).toBe('SUPERVISED');
      expect(call.update.regressedAt).toBeDefined();
    });
  });

  describe('isAutonomous()', () => {
    it('returns false when no record exists', async () => {
      const prisma = buildPrisma();
      prisma.engagementAutonomy.findUnique.mockResolvedValue(null);

      const service = new GraduationService(prisma);
      const result = await service.isAutonomous('org-1', 'x', 1);

      expect(result).toBe(false);
    });

    it('returns true when status is AUTONOMOUS', async () => {
      const prisma = buildPrisma();
      prisma.engagementAutonomy.findUnique.mockResolvedValue(
        makeAutonomy({ status: 'AUTONOMOUS' })
      );

      const service = new GraduationService(prisma);
      const result = await service.isAutonomous('org-1', 'x', 1);

      expect(result).toBe(true);
    });
  });

  describe('getAutonomyStatus()', () => {
    it('returns all tier+platform combinations for an org', async () => {
      const prisma = buildPrisma();
      prisma.engagementAutonomy.findMany.mockResolvedValue([
        makeAutonomy({ platform: 'x', tier: 1, status: 'AUTONOMOUS' }),
        makeAutonomy({ platform: 'x', tier: 3, status: 'SUPERVISED' }),
        makeAutonomy({ platform: 'linkedin', tier: 1, status: 'SUPERVISED' }),
      ]);

      const service = new GraduationService(prisma);
      const result = await service.getAutonomyStatus('org-1');

      expect(result).toHaveLength(3);
    });
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd libraries/engagement-engine && npx jest --passWithNoTests`
Expected: FAIL — `GraduationService` not found

- [ ] **Step 5: Implement GraduationService**

Create `libraries/engagement-engine/src/graduation.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import {
  GraduationWindow,
  AutonomyState,
  GRADUATION_THRESHOLD,
  REGRESSION_THRESHOLD,
  WINDOW_SIZE,
} from './graduation.interface';

@Injectable()
export class GraduationService {
  private readonly logger = new Logger(GraduationService.name);

  constructor(private readonly prisma: any) {}

  async recordOutcome(
    orgId: string,
    platform: string,
    tier: number,
    approved: boolean
  ): Promise<AutonomyState> {
    const existing = await this.prisma.engagementAutonomy.findUnique({
      where: {
        organizationId_platform_tier: { organizationId: orgId, platform, tier },
      },
    });

    const currentWindow: GraduationWindow[] = existing?.window ?? [];
    const newEntry: GraduationWindow = {
      approved,
      timestamp: new Date().toISOString(),
    };

    const updatedWindow = [...currentWindow, newEntry].slice(-WINDOW_SIZE);
    const approvedCount = updatedWindow.filter((w) => w.approved).length;
    const approvalRate = updatedWindow.length > 0 ? approvedCount / updatedWindow.length : 0;

    let newStatus = existing?.status ?? 'SUPERVISED';
    let graduatedAt = existing?.graduatedAt ?? null;
    let regressedAt = existing?.regressedAt ?? null;

    if (updatedWindow.length >= WINDOW_SIZE) {
      if (approvalRate >= GRADUATION_THRESHOLD && newStatus !== 'AUTONOMOUS') {
        newStatus = 'AUTONOMOUS';
        graduatedAt = new Date();
        this.logger.log(`Graduated ${orgId}/${platform}/tier-${tier} to AUTONOMOUS (${approvalRate * 100}%)`);
      } else if (approvalRate < REGRESSION_THRESHOLD && newStatus === 'AUTONOMOUS') {
        newStatus = 'SUPERVISED';
        regressedAt = new Date();
        this.logger.warn(`Regressed ${orgId}/${platform}/tier-${tier} to SUPERVISED (${approvalRate * 100}%)`);
      }
    }

    const result = await this.prisma.engagementAutonomy.upsert({
      where: {
        organizationId_platform_tier: { organizationId: orgId, platform, tier },
      },
      create: {
        organizationId: orgId,
        platform,
        tier,
        status: newStatus,
        window: updatedWindow,
        approvalRate,
        graduatedAt,
        regressedAt,
      },
      update: {
        status: newStatus,
        window: updatedWindow,
        approvalRate,
        graduatedAt,
        regressedAt,
      },
    });

    return {
      organizationId: result.organizationId,
      platform: result.platform,
      tier: result.tier,
      status: result.status,
      approvalRate: result.approvalRate,
      windowSize: updatedWindow.length,
      graduatedAt: result.graduatedAt?.toISOString() ?? null,
      regressedAt: result.regressedAt?.toISOString() ?? null,
    };
  }

  async isAutonomous(orgId: string, platform: string, tier: number): Promise<boolean> {
    const record = await this.prisma.engagementAutonomy.findUnique({
      where: {
        organizationId_platform_tier: { organizationId: orgId, platform, tier },
      },
    });
    return record?.status === 'AUTONOMOUS';
  }

  async getAutonomyStatus(orgId: string): Promise<AutonomyState[]> {
    const records = await this.prisma.engagementAutonomy.findMany({
      where: { organizationId: orgId },
      orderBy: [{ platform: 'asc' }, { tier: 'asc' }],
    });

    return records.map((r: any) => ({
      organizationId: r.organizationId,
      platform: r.platform,
      tier: r.tier,
      status: r.status,
      approvalRate: r.approvalRate,
      windowSize: (r.window as GraduationWindow[]).length,
      graduatedAt: r.graduatedAt?.toISOString() ?? null,
      regressedAt: r.regressedAt?.toISOString() ?? null,
    }));
  }

  async overrideStatus(
    orgId: string,
    platform: string,
    tier: number,
    status: 'SUPERVISED' | 'AUTONOMOUS'
  ): Promise<AutonomyState> {
    const result = await this.prisma.engagementAutonomy.upsert({
      where: {
        organizationId_platform_tier: { organizationId: orgId, platform, tier },
      },
      create: {
        organizationId: orgId,
        platform,
        tier,
        status,
        window: [],
        approvalRate: 0,
        graduatedAt: status === 'AUTONOMOUS' ? new Date() : null,
      },
      update: {
        status,
        window: [],
        approvalRate: 0,
        ...(status === 'AUTONOMOUS' ? { graduatedAt: new Date() } : { regressedAt: new Date() }),
      },
    });

    return {
      organizationId: result.organizationId,
      platform: result.platform,
      tier: result.tier,
      status: result.status,
      approvalRate: result.approvalRate,
      windowSize: 0,
      graduatedAt: result.graduatedAt?.toISOString() ?? null,
      regressedAt: result.regressedAt?.toISOString() ?? null,
    };
  }
}
```

- [ ] **Step 6: Create index**

Create `libraries/engagement-engine/src/index.ts`:

```typescript
export { GraduationService } from './graduation.service';
export {
  GraduationWindow,
  AutonomyState,
  GRADUATION_THRESHOLD,
  REGRESSION_THRESHOLD,
  WINDOW_SIZE,
} from './graduation.interface';
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd libraries/engagement-engine && npx jest`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add libraries/engagement-engine/
git commit -m "feat(engagement): add GraduationService with trust graduation logic"
```

---

### Task 3: Engagement Engine — EngagementService (Core CRUD + Classification)

**Files:**
- Create: `libraries/engagement-engine/src/engagement.service.ts`
- Create: `libraries/engagement-engine/src/engagement.interface.ts`
- Create: `libraries/engagement-engine/src/__tests__/engagement.service.test.ts`
- Modify: `libraries/engagement-engine/src/index.ts`

- [ ] **Step 1: Create engagement interfaces**

Create `libraries/engagement-engine/src/engagement.interface.ts`:

```typescript
export const TIER_LABELS: Record<number, string> = {
  1: 'passive',
  2: 'acknowledgment',
  3: 'conversational',
  4: 'proactive',
  5: 'sensitive',
};

export interface EngagementCreateInput {
  organizationId: string;
  platform: string;
  externalId: string;
  type: 'MENTION' | 'REPLY' | 'COMMENT' | 'DM' | 'QUOTE';
  incomingText: string;
  authorName: string;
  authorHandle: string;
}

export interface ClassifiedEngagement extends EngagementCreateInput {
  tier: number;
  sentiment: number;
  confidence: number;
}

export interface EngagementFilters {
  platform?: string;
  tier?: number;
  status?: string;
  skip?: number;
  take?: number;
}

export interface EngagementStats {
  total: number;
  responded: number;
  skipped: number;
  escalated: number;
  pending: number;
  avgConfidence: number;
  byPlatform: Record<string, number>;
  byTier: Record<number, number>;
}
```

- [ ] **Step 2: Write failing tests for EngagementService**

Create `libraries/engagement-engine/src/__tests__/engagement.service.test.ts`:

```typescript
import { EngagementService } from '../engagement.service';

function buildPrisma() {
  return {
    engagement: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
  } as any;
}

function makeEngagement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'eng-1',
    organizationId: 'org-1',
    platform: 'x',
    externalId: 'ext-123',
    type: 'MENTION',
    tier: 2,
    incomingText: 'Great post!',
    authorName: 'Jane',
    authorHandle: '@jane',
    sentiment: 0.8,
    confidence: 0.9,
    status: 'PENDING',
    responseText: null,
    respondedAt: null,
    approvalId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('EngagementService', () => {
  describe('create()', () => {
    it('creates an engagement record', async () => {
      const prisma = buildPrisma();
      const created = makeEngagement();
      prisma.engagement.create.mockResolvedValue(created);

      const service = new EngagementService(prisma);
      const result = await service.create({
        organizationId: 'org-1',
        platform: 'x',
        externalId: 'ext-123',
        type: 'MENTION',
        tier: 2,
        incomingText: 'Great post!',
        authorName: 'Jane',
        authorHandle: '@jane',
        sentiment: 0.8,
        confidence: 0.9,
      });

      expect(result.id).toBe('eng-1');
      expect(prisma.engagement.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByOrg()', () => {
    it('returns engagements with filters', async () => {
      const prisma = buildPrisma();
      prisma.engagement.findMany.mockResolvedValue([makeEngagement()]);

      const service = new EngagementService(prisma);
      const result = await service.findByOrg('org-1', { platform: 'x', status: 'PENDING' });

      expect(result).toHaveLength(1);
      const call = prisma.engagement.findMany.mock.calls[0][0];
      expect(call.where.platform).toBe('x');
      expect(call.where.status).toBe('PENDING');
    });
  });

  describe('markResponded()', () => {
    it('updates status to RESPONDED with response text', async () => {
      const prisma = buildPrisma();
      prisma.engagement.update.mockResolvedValue(
        makeEngagement({ status: 'RESPONDED', responseText: 'Thanks!' })
      );

      const service = new EngagementService(prisma);
      await service.markResponded('eng-1', 'Thanks!');

      const call = prisma.engagement.update.mock.calls[0][0];
      expect(call.data.status).toBe('RESPONDED');
      expect(call.data.responseText).toBe('Thanks!');
      expect(call.data.respondedAt).toBeDefined();
    });
  });

  describe('markSkipped()', () => {
    it('updates status to SKIPPED', async () => {
      const prisma = buildPrisma();
      prisma.engagement.update.mockResolvedValue(makeEngagement({ status: 'SKIPPED' }));

      const service = new EngagementService(prisma);
      await service.markSkipped('eng-1');

      const call = prisma.engagement.update.mock.calls[0][0];
      expect(call.data.status).toBe('SKIPPED');
    });
  });

  describe('classifyTier()', () => {
    it('classifies positive mentions as tier 2 (acknowledgment)', () => {
      const service = new EngagementService({} as any);
      const tier = service.classifyTier('MENTION', 0.8, 'Love this!');
      expect(tier).toBe(2);
    });

    it('classifies questions as tier 3 (conversational)', () => {
      const service = new EngagementService({} as any);
      const tier = service.classifyTier('REPLY', 0.1, 'How does this work?');
      expect(tier).toBe(3);
    });

    it('classifies negative sentiment as tier 5 (sensitive)', () => {
      const service = new EngagementService({} as any);
      const tier = service.classifyTier('COMMENT', -0.6, 'This is terrible');
      expect(tier).toBe(5);
    });

    it('classifies DMs as tier 5 (sensitive)', () => {
      const service = new EngagementService({} as any);
      const tier = service.classifyTier('DM', 0.5, 'Hello');
      expect(tier).toBe(5);
    });

    it('classifies QUOTE as tier 4 (proactive)', () => {
      const service = new EngagementService({} as any);
      const tier = service.classifyTier('QUOTE', 0.3, 'Interesting take');
      expect(tier).toBe(4);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd libraries/engagement-engine && npx jest`
Expected: FAIL — `EngagementService` not found

- [ ] **Step 4: Implement EngagementService**

Create `libraries/engagement-engine/src/engagement.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ClassifiedEngagement, EngagementFilters } from './engagement.interface';

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(private readonly prisma: any) {}

  async create(data: ClassifiedEngagement & { tier: number; sentiment: number; confidence: number }) {
    return this.prisma.engagement.create({
      data: {
        organizationId: data.organizationId,
        platform: data.platform,
        externalId: data.externalId,
        type: data.type,
        tier: data.tier,
        incomingText: data.incomingText,
        authorName: data.authorName,
        authorHandle: data.authorHandle,
        sentiment: data.sentiment,
        confidence: data.confidence,
      },
    });
  }

  async findByOrg(orgId: string, filters: EngagementFilters = {}) {
    return this.prisma.engagement.findMany({
      where: {
        organizationId: orgId,
        ...(filters.platform ? { platform: filters.platform } : {}),
        ...(filters.tier ? { tier: filters.tier } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: filters.skip ?? 0,
      take: filters.take ?? 50,
    });
  }

  async findMissed(orgId: string) {
    return this.prisma.engagement.findMany({
      where: { organizationId: orgId, status: 'SKIPPED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.engagement.findUnique({ where: { id } });
  }

  async markResponded(id: string, responseText: string, approvalId?: string) {
    return this.prisma.engagement.update({
      where: { id },
      data: {
        status: 'RESPONDED',
        responseText,
        respondedAt: new Date(),
        ...(approvalId ? { approvalId } : {}),
      },
    });
  }

  async markSkipped(id: string) {
    return this.prisma.engagement.update({
      where: { id },
      data: { status: 'SKIPPED' },
    });
  }

  async markEscalated(id: string, approvalId: string) {
    return this.prisma.engagement.update({
      where: { id },
      data: { status: 'ESCALATED', approvalId },
    });
  }

  /**
   * Classify an incoming engagement into a tier (1-5).
   * Uses type, sentiment, and text heuristics.
   * In production, this would be augmented by LLM classification.
   */
  classifyTier(
    type: string,
    sentiment: number,
    text: string
  ): number {
    // DMs are always sensitive
    if (type === 'DM') return 5;

    // Negative sentiment → sensitive
    if (sentiment < -0.3) return 5;

    // Quotes → proactive (someone is referencing our content)
    if (type === 'QUOTE') return 4;

    // Questions → conversational
    const isQuestion = /\?/.test(text) || /^(how|what|why|when|where|can|does|is|are|do)\b/i.test(text);
    if (isQuestion) return 3;

    // Positive or neutral short responses → acknowledgment
    if (sentiment > 0.3 && text.length < 200) return 2;

    // Longer substantive content → conversational
    if (text.length >= 200) return 3;

    // Default to acknowledgment for simple mentions/replies
    if (type === 'MENTION' || type === 'REPLY') return 2;

    // Default
    return 3;
  }
}
```

- [ ] **Step 5: Update index exports**

Update `libraries/engagement-engine/src/index.ts`:

```typescript
export { GraduationService } from './graduation.service';
export { EngagementService } from './engagement.service';
export {
  GraduationWindow,
  AutonomyState,
  GRADUATION_THRESHOLD,
  REGRESSION_THRESHOLD,
  WINDOW_SIZE,
} from './graduation.interface';
export {
  TIER_LABELS,
  EngagementCreateInput,
  ClassifiedEngagement,
  EngagementFilters,
  EngagementStats,
} from './engagement.interface';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd libraries/engagement-engine && npx jest`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add libraries/engagement-engine/
git commit -m "feat(engagement): add EngagementService with CRUD and tier classification"
```

---

### Task 4: Engagement Pipeline — Response Drafting with Persona + Compliance

**Files:**
- Create: `libraries/engagement-engine/src/engagement.pipeline.ts`
- Create: `libraries/engagement-engine/src/__tests__/engagement.pipeline.test.ts`
- Modify: `libraries/engagement-engine/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `libraries/engagement-engine/src/__tests__/engagement.pipeline.test.ts`:

```typescript
import { EngagementPipeline } from '../engagement.pipeline';

function buildPersonaService() {
  return {
    getActive: jest.fn().mockResolvedValue({
      id: 'persona-1',
      name: 'TestBot',
      tone: ['friendly', 'professional'],
      topics: ['tech', 'AI'],
      replyStyle: 'Casual and warm. Keep replies short.',
      boundaries: ['politics'],
      escalationPhrases: ['lawsuit', 'refund'],
      complaintPlaybook: 'Acknowledge, empathize, offer help.',
      engagementExamples: {
        acknowledgment: [{ incoming: 'Great post!', response: 'Thanks! Glad it resonated.' }],
      },
    }),
    buildSystemPrompt: jest.fn().mockReturnValue('You are TestBot.'),
  } as any;
}

function buildComplianceService() {
  return {
    checkContent: jest.fn().mockResolvedValue({
      allowed: true,
      riskScore: 0.1,
      checks: [],
      contentHash: 'abc123',
    }),
    checkRateLimit: jest.fn().mockResolvedValue(true),
  } as any;
}

describe('EngagementPipeline', () => {
  describe('shouldSkip()', () => {
    it('returns true when incoming text matches a boundary topic', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const result = pipeline.shouldSkip(
        'What do you think about the election?',
        { boundaries: ['politics', 'elections'], escalationPhrases: [] }
      );

      expect(result).toBe(true);
    });

    it('returns false when text does not match any boundary', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const result = pipeline.shouldSkip(
        'How does your AI work?',
        { boundaries: ['politics'], escalationPhrases: [] }
      );

      expect(result).toBe(false);
    });
  });

  describe('shouldEscalate()', () => {
    it('returns true when text contains an escalation phrase', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const result = pipeline.shouldEscalate(
        'I want a refund immediately',
        { boundaries: [], escalationPhrases: ['refund', 'lawsuit'] }
      );

      expect(result).toBe(true);
    });
  });

  describe('buildReplySystemPrompt()', () => {
    it('includes reply style and complaint playbook for sensitive tier', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const prompt = pipeline.buildReplySystemPrompt(
        {
          name: 'TestBot',
          tone: ['friendly'],
          replyStyle: 'Keep replies under 280 chars.',
          complaintPlaybook: 'Acknowledge then empathize.',
          engagementExamples: {},
        } as any,
        'x',
        5 // sensitive tier
      );

      expect(prompt).toContain('Keep replies under 280 chars');
      expect(prompt).toContain('Acknowledge then empathize');
    });

    it('includes few-shot examples for the tier', () => {
      const pipeline = new EngagementPipeline(
        buildPersonaService(),
        buildComplianceService()
      );

      const prompt = pipeline.buildReplySystemPrompt(
        {
          name: 'TestBot',
          tone: ['friendly'],
          replyStyle: 'Be warm.',
          engagementExamples: {
            acknowledgment: [{ incoming: 'Nice!', response: 'Thanks!' }],
          },
        } as any,
        'x',
        2 // acknowledgment tier
      );

      expect(prompt).toContain('Nice!');
      expect(prompt).toContain('Thanks!');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd libraries/engagement-engine && npx jest engagement.pipeline`
Expected: FAIL

- [ ] **Step 3: Implement EngagementPipeline**

Create `libraries/engagement-engine/src/engagement.pipeline.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { TIER_LABELS } from './engagement.interface';

interface PersonaEngagementFields {
  name: string;
  tone: string[];
  replyStyle?: string | null;
  engagementExamples?: Record<string, { incoming: string; response: string }[]> | null;
  boundaries?: string[];
  escalationPhrases?: string[];
  complaintPlaybook?: string | null;
  proactiveRules?: string | null;
}

@Injectable()
export class EngagementPipeline {
  private readonly logger = new Logger(EngagementPipeline.name);

  constructor(
    private readonly personaService: any,
    private readonly complianceService: any
  ) {}

  /**
   * Check if the incoming text touches a boundary topic.
   * Returns true if the agent should skip (confidence < 40%).
   */
  shouldSkip(
    incomingText: string,
    persona: { boundaries: string[]; escalationPhrases: string[] }
  ): boolean {
    const lower = incomingText.toLowerCase();
    return persona.boundaries.some((b) => lower.includes(b.toLowerCase()));
  }

  /**
   * Check if the incoming text contains escalation phrases.
   * Returns true if the response should always go to the approval queue.
   */
  shouldEscalate(
    incomingText: string,
    persona: { boundaries: string[]; escalationPhrases: string[] }
  ): boolean {
    const lower = incomingText.toLowerCase();
    return persona.escalationPhrases.some((p) => lower.includes(p.toLowerCase()));
  }

  /**
   * Build the system prompt for engagement reply generation.
   * Includes persona voice, reply style, tier-specific guidance, and few-shot examples.
   */
  buildReplySystemPrompt(
    persona: PersonaEngagementFields,
    platform: string,
    tier: number
  ): string {
    const tierLabel = TIER_LABELS[tier] ?? 'conversational';
    const parts: string[] = [];

    parts.push(`You are ${persona.name}, replying to a ${tierLabel} engagement on ${platform}.`);
    parts.push(`Your tone: ${persona.tone.join(', ')}.`);

    if (persona.replyStyle) {
      parts.push(`Reply style: ${persona.replyStyle}`);
    }

    // Tier-specific guidance
    if (tier === 1) {
      parts.push('This is a passive engagement. React with a like or simple emoji. Keep it minimal.');
    } else if (tier === 2) {
      parts.push('This is an acknowledgment. Thank them warmly but briefly. One sentence max.');
    } else if (tier === 3) {
      parts.push('This is a conversational reply. Engage substantively — answer questions, add perspective. Keep it concise but valuable.');
    } else if (tier === 4) {
      parts.push('This is a proactive engagement. You are joining a conversation. Add genuine value — share insight or ask a thoughtful question. Never self-promote.');
      if (persona.proactiveRules) {
        parts.push(`Proactive rules: ${persona.proactiveRules}`);
      }
    } else if (tier === 5) {
      parts.push('This is a sensitive engagement. Handle with care.');
      if (persona.complaintPlaybook) {
        parts.push(`Follow this playbook: ${persona.complaintPlaybook}`);
      }
    }

    // Few-shot examples for this tier
    const examples = persona.engagementExamples?.[tierLabel];
    if (examples && examples.length > 0) {
      parts.push('\nExamples of ideal replies:');
      for (const ex of examples) {
        parts.push(`  User: "${ex.incoming}"`);
        parts.push(`  You: "${ex.response}"`);
      }
    }

    parts.push('\nRules:');
    parts.push('- Reply in the same language as the incoming message.');
    parts.push('- Be authentic, not robotic.');
    parts.push('- Do not use hashtags in replies unless the platform culture expects it.');
    parts.push('- Never disclose that you are an AI unless directly asked.');

    return parts.join('\n');
  }

  /**
   * Run compliance checks on the drafted response.
   */
  async checkCompliance(responseText: string, platform: string) {
    return this.complianceService.checkContent(
      { text: responseText, images: [], videos: [] },
      platform
    );
  }
}
```

- [ ] **Step 4: Update index exports**

Add to `libraries/engagement-engine/src/index.ts`:

```typescript
export { EngagementPipeline } from './engagement.pipeline';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd libraries/engagement-engine && npx jest`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add libraries/engagement-engine/
git commit -m "feat(engagement): add EngagementPipeline with persona-aware response drafting"
```

---

### Task 5: Persona Engine — Add Engagement Fields

**Files:**
- Modify: `libraries/persona-engine/src/persona.interface.ts`
- Modify: `libraries/persona-engine/src/persona.service.ts`

- [ ] **Step 1: Add engagement interfaces to persona.interface.ts**

Add at the end of `libraries/persona-engine/src/persona.interface.ts`:

```typescript
export interface EngagementExample {
  incoming: string;
  response: string;
}

export interface PersonaEngagementConfig {
  replyStyle?: string;
  engagementExamples?: Record<string, EngagementExample[]>;
  boundaries?: string[];
  escalationPhrases?: string[];
  complaintPlaybook?: string;
  proactiveRules?: string;
}
```

- [ ] **Step 2: Update PersonaCreateInput and PersonaUpdateInput**

In `PersonaCreateInput`, add after `platformOverrides`:

```typescript
  replyStyle?: string;
  engagementExamples?: Record<string, EngagementExample[]>;
  boundaries?: string[];
  escalationPhrases?: string[];
  complaintPlaybook?: string;
  proactiveRules?: string;
```

- [ ] **Step 3: Update PersonaService.create() to persist new fields**

In `libraries/persona-engine/src/persona.service.ts`, in the `create` method, add the new fields to the `data` object after `platformOverrides`:

```typescript
        replyStyle: data.replyStyle ?? undefined,
        engagementExamples: (data.engagementExamples as any) ?? undefined,
        boundaries: data.boundaries ?? [],
        escalationPhrases: data.escalationPhrases ?? [],
        complaintPlaybook: data.complaintPlaybook ?? undefined,
        proactiveRules: data.proactiveRules ?? undefined,
```

- [ ] **Step 4: Update PersonaService.update() similarly**

Ensure the `update` method passes through the new fields.

- [ ] **Step 5: Commit**

```bash
git add libraries/persona-engine/
git commit -m "feat(persona): add engagement-specific fields (replyStyle, boundaries, escalation)"
```

---

### Task 6: Backend API — Engagement Controller

**Files:**
- Create: `apps/backend/src/public-api/routes/v1/public.engagement.controller.ts`
- Modify: `apps/backend/src/public-api/public.api.module.ts`

- [ ] **Step 1: Create the controller**

Create `apps/backend/src/public-api/routes/v1/public.engagement.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@mav/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PrismaService } from '@mav/nestjs-libraries/database/prisma/prisma.service';
import { EngagementService } from '@mav/engagement-engine/engagement.service';
import { GraduationService } from '@mav/engagement-engine/graduation.service';
import { ApprovalService } from '@mav/approval-engine/approval.service';

@ApiTags('Engagements')
@Controller('/public/v1/engagements')
export class PublicEngagementController {
  private readonly logger = new Logger(PublicEngagementController.name);

  constructor(
    private readonly engagementService: EngagementService,
    private readonly graduationService: GraduationService,
    private readonly approvalService: ApprovalService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('/')
  async list(
    @GetOrgFromRequest() org: Organization,
    @Query('platform') platform?: string,
    @Query('tier') tier?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.engagementService.findByOrg(org.id, {
      platform,
      tier: tier ? parseInt(tier, 10) : undefined,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('/missed')
  async getMissed(@GetOrgFromRequest() org: Organization) {
    return this.engagementService.findMissed(org.id);
  }

  @Post('/:id/teach')
  async teach(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { idealResponse: string },
  ) {
    const engagement = await this.engagementService.findById(id);
    if (!engagement) {
      return { error: 'Engagement not found' };
    }

    // Update the active persona's engagementExamples with this teaching
    const persona = await this.prisma.persona.findFirst({
      where: { organizationId: org.id, isActive: true },
    });

    if (persona) {
      const tier = engagement.tier;
      const tierLabel = { 1: 'passive', 2: 'acknowledgment', 3: 'conversational', 4: 'proactive', 5: 'sensitive' }[tier] ?? 'conversational';
      const existing = (persona.engagementExamples as any) ?? {};
      const tierExamples = existing[tierLabel] ?? [];
      tierExamples.push({
        incoming: engagement.incomingText,
        response: body.idealResponse,
      });
      existing[tierLabel] = tierExamples;

      await this.prisma.persona.update({
        where: { id: persona.id },
        data: { engagementExamples: existing },
      });
    }

    return { success: true };
  }

  @Get('/autonomy')
  async getAutonomy(@GetOrgFromRequest() org: Organization) {
    return this.graduationService.getAutonomyStatus(org.id);
  }

  @Put('/autonomy')
  async overrideAutonomy(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { platform: string; tier: number; status: 'SUPERVISED' | 'AUTONOMOUS' },
  ) {
    return this.graduationService.overrideStatus(
      org.id,
      body.platform,
      body.tier,
      body.status,
    );
  }

  @Post('/poll')
  async triggerPoll(@GetOrgFromRequest() org: Organization) {
    // Placeholder — will be implemented when Temporal workflow is wired
    return {
      message: 'Poll triggered',
      orgId: org.id,
    };
  }
}
```

- [ ] **Step 2: Register controller in PublicApiModule**

In `apps/backend/src/public-api/public.api.module.ts`:

Add import:
```typescript
import { PublicEngagementController } from '@mav/backend/public-api/routes/v1/public.engagement.controller';
```

Add to `authenticatedController` array:
```typescript
  PublicEngagementController,
```

Add providers for the engagement services:
```typescript
import { EngagementService } from '@mav/engagement-engine/engagement.service';
import { GraduationService } from '@mav/engagement-engine/graduation.service';
```

Add to `providers` array:
```typescript
    EngagementService,
    GraduationService,
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/public-api/
git commit -m "feat(api): add engagement controller with CRUD, teach, and autonomy endpoints"
```

---

### Task 7: Engagement NestJS Module

**Files:**
- Create: `libraries/engagement-engine/src/engagement.module.ts`
- Modify: `libraries/engagement-engine/src/index.ts`

- [ ] **Step 1: Create the NestJS module**

Create `libraries/engagement-engine/src/engagement.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { GraduationService } from './graduation.service';
import { EngagementPipeline } from './engagement.pipeline';

@Global()
@Module({
  providers: [EngagementService, GraduationService, EngagementPipeline],
  exports: [EngagementService, GraduationService, EngagementPipeline],
})
export class EngagementModule {}
```

- [ ] **Step 2: Export module from index**

Add to `libraries/engagement-engine/src/index.ts`:

```typescript
export { EngagementModule } from './engagement.module';
```

- [ ] **Step 3: Import EngagementModule in AppModule**

In `apps/backend/src/app.module.ts`, add:

```typescript
import { EngagementModule } from '@mav/engagement-engine';
```

And add `EngagementModule` to the `imports` array.

- [ ] **Step 4: Commit**

```bash
git add libraries/engagement-engine/ apps/backend/src/app.module.ts
git commit -m "feat(engagement): add NestJS EngagementModule and wire into backend"
```

---

### Task 8: MCP Server — Engagement Tools

**Files:**
- Create: `apps/mcp-server/src/tools/engagement.ts`
- Modify: `apps/mcp-server/src/index.ts`

- [ ] **Step 1: Create engagement tools**

Create `apps/mcp-server/src/tools/engagement.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api-client';

export function registerEngagementTools(server: McpServer) {
  server.tool(
    'get_engagement_queue',
    'List pending engagements that need responses. Filter by platform, tier, or status.',
    {
      platform: z.string().optional().describe('Filter by platform (x, linkedin, bluesky, etc.)'),
      status: z.enum(['PENDING', 'RESPONDED', 'SKIPPED', 'ESCALATED']).optional(),
      tier: z.number().min(1).max(5).optional().describe('Engagement tier: 1=passive, 2=acknowledgment, 3=conversational, 4=proactive, 5=sensitive'),
      take: z.number().optional().default(20),
    },
    async (params) => {
      try {
        const query = new URLSearchParams();
        if (params.platform) query.append('platform', params.platform);
        if (params.status) query.append('status', params.status);
        if (params.tier) query.append('tier', params.tier.toString());
        query.append('take', params.take.toString());

        const result = await api.genericGet(`/public/v1/engagements?${query.toString()}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_missed_engagements',
    'List engagements that were skipped due to low confidence. These can be used to teach the agent better responses.',
    {},
    async () => {
      try {
        const result = await api.genericGet('/public/v1/engagements/missed');
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'teach_engagement',
    'Teach the agent how to respond to a missed engagement by providing an ideal response. This adds the example to the persona\'s engagement examples.',
    {
      engagement_id: z.string().describe('The ID of the missed engagement'),
      ideal_response: z.string().describe('The ideal response the agent should have given'),
    },
    async (params) => {
      try {
        const result = await api.genericPost(
          `/public/v1/engagements/${params.engagement_id}/teach`,
          { idealResponse: params.ideal_response }
        );
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_autonomy_status',
    'View the trust graduation status for each platform and engagement tier. Shows whether the agent is supervised, graduating, or autonomous.',
    {},
    async () => {
      try {
        const result = await api.genericGet('/public/v1/engagements/autonomy');
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'override_autonomy',
    'Manually promote or demote a tier+platform combination. Use to force autonomous mode or reset to supervised.',
    {
      platform: z.string().describe('Platform name (x, linkedin, bluesky, etc.)'),
      tier: z.number().min(1).max(5).describe('Engagement tier (1-5)'),
      status: z.enum(['SUPERVISED', 'AUTONOMOUS']).describe('New autonomy status'),
    },
    async (params) => {
      try {
        const result = await api.genericPost('/public/v1/engagements/autonomy', {
          platform: params.platform,
          tier: params.tier,
          status: params.status,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
```

- [ ] **Step 2: Register in MCP server index**

In `apps/mcp-server/src/index.ts`, add:

```typescript
import { registerEngagementTools } from './tools/engagement';
```

And after the existing `registerBrainTools(server);` line:

```typescript
registerEngagementTools(server);
```

- [ ] **Step 3: Commit**

```bash
git add apps/mcp-server/src/
git commit -m "feat(mcp): add engagement tools (queue, missed, teach, autonomy)"
```

---

### Task 9: Temporal Workflow — Engagement Polling

**Files:**
- Create: `apps/orchestrator/src/workflows/engagement.workflow.ts`
- Create: `apps/orchestrator/src/activities/engagement.activity.ts`
- Modify: `apps/orchestrator/src/workflows/index.ts`

- [ ] **Step 1: Create engagement workflow**

Create `apps/orchestrator/src/workflows/engagement.workflow.ts`:

```typescript
import { proxyActivities, sleep } from '@temporalio/workflow';
import type { EngagementActivity } from '@mav/orchestrator/activities/engagement.activity';

const { pollEngagements, processEngagementCycle } = proxyActivities<EngagementActivity>({
  startToCloseTimeout: '5 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '1 minute',
  },
});

/**
 * Engagement Polling Workflow — runs continuously, polling platforms for
 * new mentions/replies/comments and processing them through the engagement pipeline.
 *
 * Default interval: 15 minutes (configurable per tier response targets).
 */
export async function engagementWorkflow({
  orgId,
  intervalMs = 15 * 60 * 1000, // 15 minutes
  immediately = false,
}: {
  orgId: string;
  intervalMs?: number;
  immediately?: boolean;
}) {
  while (true) {
    if (immediately) {
      try {
        await pollEngagements(orgId);
        await processEngagementCycle(orgId);
      } catch (err) {
        // Log and continue — will retry next cycle
      }
    }
    immediately = true;
    await sleep(intervalMs);
  }
}

/**
 * One-shot engagement poll — poll once and process, then exit.
 * Used for manual triggers via API or MCP.
 */
export async function engagementOneShotWorkflow({ orgId }: { orgId: string }) {
  await pollEngagements(orgId);
  return processEngagementCycle(orgId);
}
```

- [ ] **Step 2: Create engagement activity**

Create `apps/orchestrator/src/activities/engagement.activity.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { PrismaService } from '@mav/nestjs-libraries/database/prisma/prisma.service';

/**
 * Engagement Activity — polls platforms for new engagements and processes them.
 *
 * In v1, this is a stub that demonstrates the Temporal activity pattern.
 * Real platform polling will be implemented when individual platform
 * integrations expose mention/reply fetching methods.
 */
@Injectable()
@Activity()
export class EngagementActivity {
  private readonly logger = new Logger(EngagementActivity.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Poll connected platforms for new mentions, replies, comments.
   * Creates Engagement records for each new item found.
   */
  @ActivityMethod()
  async pollEngagements(orgId: string): Promise<{
    discovered: number;
    platforms: string[];
    errors: string[];
  }> {
    this.logger.log(`Polling engagements for org ${orgId}`);

    const result = {
      discovered: 0,
      platforms: [] as string[],
      errors: [] as string[],
    };

    try {
      const integrations = await this.prisma.integration.findMany({
        where: { organizationId: orgId, disabled: false },
      });

      for (const integration of integrations) {
        const providerName = integration.providerIdentifier?.toLowerCase();
        if (providerName) {
          result.platforms.push(providerName);
        }
        // TODO: Call platform-specific mention/reply fetching APIs
        // Each platform provider will need a fetchMentions() method
        // For now, this is a no-op that logs which platforms are connected
      }

      this.logger.log(`Polled ${result.platforms.length} platforms, discovered ${result.discovered} new engagements`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      this.logger.error(`Poll failed for org ${orgId}: ${message}`);
    }

    return result;
  }

  /**
   * Process pending engagements: classify, draft responses, route through
   * compliance and approval based on graduation status.
   */
  @ActivityMethod()
  async processEngagementCycle(orgId: string): Promise<{
    processed: number;
    responded: number;
    skipped: number;
    escalated: number;
    errors: string[];
  }> {
    this.logger.log(`Processing engagement cycle for org ${orgId}`);

    const result = {
      processed: 0,
      responded: 0,
      skipped: 0,
      escalated: 0,
      errors: [] as string[],
    };

    try {
      const pending = await this.prisma.engagement.findMany({
        where: { organizationId: orgId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      result.processed = pending.length;

      // TODO: For each pending engagement:
      // 1. Check persona boundaries → skip if boundary hit
      // 2. Check escalation phrases → force approval queue
      // 3. Draft response via EngagementPipeline
      // 4. Run compliance checks
      // 5. Check graduation status → auto-send or queue
      // 6. Record outcome in graduation window

      this.logger.log(`Processed ${result.processed} engagements: ${result.responded} responded, ${result.skipped} skipped, ${result.escalated} escalated`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      this.logger.error(`Engagement cycle failed for org ${orgId}: ${message}`);
    }

    return result;
  }
}
```

- [ ] **Step 3: Export workflows from index**

In `apps/orchestrator/src/workflows/index.ts`, add:

```typescript
export { engagementWorkflow, engagementOneShotWorkflow } from './engagement.workflow';
```

- [ ] **Step 4: Register activity in orchestrator app module**

In `apps/orchestrator/src/app.module.ts`, import and add `EngagementActivity` to providers.

- [ ] **Step 5: Commit**

```bash
git add apps/orchestrator/src/
git commit -m "feat(orchestrator): add engagement polling workflow and activity"
```

---

### Task 10: Frontend — Engagement Queue Page

**Files:**
- Create: `apps/frontend/src/components/engagements/engagement-queue.tsx`
- Create: `apps/frontend/src/app/(app)/(site)/engagements/page.tsx`

- [ ] **Step 1: Create the engagement queue component**

Create `apps/frontend/src/components/engagements/engagement-queue.tsx`:

```tsx
'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@mav/helpers/utils/custom.fetch';
import { LoadingComponent } from '@mav/frontend/components/layout/loading';
import { useToaster } from '@mav/react/toaster/toaster';

interface Engagement {
  id: string;
  platform: string;
  type: string;
  tier: number;
  incomingText: string;
  authorName: string;
  authorHandle: string;
  sentiment: number;
  confidence: number;
  status: string;
  responseText: string | null;
  createdAt: string;
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Passive', color: 'bg-gray-100 text-gray-600' },
  2: { label: 'Acknowledgment', color: 'bg-green-100 text-green-700' },
  3: { label: 'Conversational', color: 'bg-blue-100 text-blue-700' },
  4: { label: 'Proactive', color: 'bg-purple-100 text-purple-700' },
  5: { label: 'Sensitive', color: 'bg-red-100 text-red-700' },
};

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  x: { bg: 'bg-[#F4F4F5]', text: 'text-[#3F3F46]', label: 'X' },
  linkedin: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]', label: 'LinkedIn' },
  bluesky: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Bluesky' },
};

function getSentimentLabel(s: number): { label: string; color: string } {
  if (s > 0.3) return { label: 'Positive', color: 'text-green-600' };
  if (s < -0.3) return { label: 'Negative', color: 'text-red-600' };
  return { label: 'Neutral', color: 'text-gray-500' };
}

const EngagementCard: FC<{
  item: Engagement;
  onTeach: (id: string, response: string) => Promise<void>;
}> = ({ item, onTeach }) => {
  const [teachResponse, setTeachResponse] = useState('');
  const [showTeach, setShowTeach] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tierStyle = TIER_LABELS[item.tier] ?? { label: 'Unknown', color: 'bg-gray-100 text-gray-600' };
  const platformStyle = PLATFORM_STYLES[item.platform?.toLowerCase()] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: item.platform };
  const sentimentStyle = getSentimentLabel(item.sentiment);

  const handleTeach = useCallback(async () => {
    if (!teachResponse.trim()) return;
    setIsSubmitting(true);
    try {
      await onTeach(item.id, teachResponse);
      setShowTeach(false);
      setTeachResponse('');
    } finally {
      setIsSubmitting(false);
    }
  }, [item.id, teachResponse, onTeach]);

  return (
    <div className="rounded-xl border border-[#E8E5E0] bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${platformStyle.bg} ${platformStyle.text}`}>
            {platformStyle.label}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tierStyle.color}`}>
            {tierStyle.label}
          </span>
          <span className={`text-xs ${sentimentStyle.color}`}>
            {sentimentStyle.label}
          </span>
        </div>
        <span className="text-xs text-[#A3A09B]">
          {item.confidence >= 0.7 ? 'High confidence' : item.confidence >= 0.4 ? 'Low confidence' : 'Skipped'}
        </span>
      </div>

      <div className="text-sm">
        <span className="font-medium text-[#3F3F46]">{item.authorHandle}</span>
        <p className="mt-1 text-[#52525B]">{item.incomingText}</p>
      </div>

      {item.responseText && (
        <div className="bg-[#FAFAF8] rounded-lg p-3 text-sm text-[#52525B] border-l-2 border-[#7C5CFC]">
          <span className="text-xs text-[#A3A09B] block mb-1">Agent reply:</span>
          {item.responseText}
        </div>
      )}

      {item.status === 'SKIPPED' && (
        <div>
          {!showTeach ? (
            <button
              onClick={() => setShowTeach(true)}
              className="text-xs text-[#7C5CFC] hover:underline"
            >
              Teach the agent how to respond
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={teachResponse}
                onChange={(e) => setTeachResponse(e.target.value)}
                placeholder="How should the agent have responded?"
                className="w-full text-sm border border-[#E8E5E0] rounded-lg p-2 resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleTeach}
                  disabled={isSubmitting || !teachResponse.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#7C5CFC] text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Example'}
                </button>
                <button
                  onClick={() => setShowTeach(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#E8E5E0] text-[#52525B]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const EngagementQueue: FC = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadEngagements = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    const response = await fetch(`/engagements?${params.toString()}`);
    return (await response.json()) as Engagement[];
  }, [statusFilter, fetch]);

  const { data: engagements, isLoading, mutate } = useSWR(
    ['engagements', statusFilter],
    loadEngagements,
    { refreshInterval: 30000, fallbackData: [] }
  );

  const handleTeach = useCallback(async (id: string, response: string) => {
    try {
      await fetch(`/engagements/${id}/teach`, {
        method: 'POST',
        body: JSON.stringify({ idealResponse: response }),
      });
      toaster.show('Example saved — the agent will learn from this!', 'success');
      await mutate();
    } catch {
      toaster.show('Failed to save example', 'error');
    }
  }, [fetch, toaster, mutate]);

  if (isLoading) return <LoadingComponent />;

  return (
    <div className="flex-1 p-6 overflow-auto max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight">
          Engagements
        </h1>
        <p className="text-sm text-[#A3A09B] mt-1">
          Mentions, replies, and comments across your connected platforms
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'RESPONDED', 'SKIPPED', 'ESCALATED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
                : 'border-[#E8E5E0] text-[#52525B] hover:bg-[#F4F4F5]'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {engagements && engagements.length > 0 ? (
          engagements.map((item) => (
            <EngagementCard key={item.id} item={item} onTeach={handleTeach} />
          ))
        ) : (
          <div className="text-center py-12 text-[#A3A09B]">
            <p className="text-lg font-medium">No engagements yet</p>
            <p className="text-sm mt-1">
              Connect platforms and enable engagement monitoring to start
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create the page route**

Create `apps/frontend/src/app/(app)/(site)/engagements/page.tsx`:

```tsx
export const dynamic = 'force-dynamic';

import { EngagementQueue } from '@mav/frontend/components/engagements/engagement-queue';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mav - Engagements',
  description: '',
};

export default async function Index() {
  return <EngagementQueue />;
}
```

- [ ] **Step 3: Add navigation link to sidebar**

Find the sidebar component and add an "Engagements" link pointing to `/engagements`, positioned after "Approvals" in the navigation.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/engagements/ apps/frontend/src/app/\(app\)/\(site\)/engagements/
git commit -m "feat(frontend): add engagement queue page with teach-the-agent UX"
```

---

### Task 11: Update tsconfig paths for engagement-engine

**Files:**
- Modify: `tsconfig.base.json`

- [ ] **Step 1: Add path alias**

Add to the `paths` section in `tsconfig.base.json`:

```json
"@mav/engagement-engine": ["libraries/engagement-engine/src/index.ts"],
"@mav/engagement-engine/*": ["libraries/engagement-engine/src/*"]
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.base.json
git commit -m "chore: add @mav/engagement-engine path alias"
```

---

### Task 12: Integration Test — Full Engagement Flow

**Files:**
- Create: `libraries/engagement-engine/src/__tests__/engagement.flow.test.ts`

- [ ] **Step 1: Write integration test for the full engagement flow**

Create `libraries/engagement-engine/src/__tests__/engagement.flow.test.ts`:

```typescript
import { EngagementService } from '../engagement.service';
import { GraduationService } from '../graduation.service';
import { EngagementPipeline } from '../engagement.pipeline';
import { GRADUATION_THRESHOLD, WINDOW_SIZE } from '../graduation.interface';

function buildPrisma() {
  const engagements = new Map<string, any>();
  const autonomies = new Map<string, any>();

  return {
    engagement: {
      create: jest.fn(({ data }) => {
        const record = { id: `eng-${Date.now()}`, ...data, createdAt: new Date() };
        engagements.set(record.id, record);
        return Promise.resolve(record);
      }),
      findMany: jest.fn(({ where }) => {
        const all = Array.from(engagements.values());
        return Promise.resolve(
          all.filter((e) =>
            (!where.organizationId || e.organizationId === where.organizationId) &&
            (!where.status || e.status === where.status)
          )
        );
      }),
      findUnique: jest.fn(({ where }) => Promise.resolve(engagements.get(where.id) ?? null)),
      update: jest.fn(({ where, data }) => {
        const existing = engagements.get(where.id);
        if (existing) Object.assign(existing, data);
        return Promise.resolve(existing);
      }),
    },
    engagementAutonomy: {
      findUnique: jest.fn(({ where }) => {
        const key = `${where.organizationId_platform_tier.organizationId}:${where.organizationId_platform_tier.platform}:${where.organizationId_platform_tier.tier}`;
        return Promise.resolve(autonomies.get(key) ?? null);
      }),
      upsert: jest.fn(({ where, create, update }) => {
        const key = `${where.organizationId_platform_tier.organizationId}:${where.organizationId_platform_tier.platform}:${where.organizationId_platform_tier.tier}`;
        const existing = autonomies.get(key);
        const record = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { id: `auto-${Date.now()}`, ...create, createdAt: new Date(), updatedAt: new Date() };
        autonomies.set(key, record);
        return Promise.resolve(record);
      }),
      findMany: jest.fn(() => Promise.resolve(Array.from(autonomies.values()))),
    },
  } as any;
}

describe('Engagement Flow Integration', () => {
  it('processes an engagement from creation through graduation', async () => {
    const prisma = buildPrisma();
    const engagementService = new EngagementService(prisma);
    const graduationService = new GraduationService(prisma);

    // 1. Create an engagement
    const engagement = await engagementService.create({
      organizationId: 'org-1',
      platform: 'x',
      externalId: 'tweet-123',
      type: 'MENTION',
      tier: 2,
      incomingText: 'Great post!',
      authorName: 'Jane',
      authorHandle: '@jane',
      sentiment: 0.8,
      confidence: 0.9,
    });

    expect(engagement.id).toBeDefined();
    expect(engagement.status).toBeUndefined(); // status is set by Prisma default

    // 2. Check graduation — should be supervised (no records yet)
    const isAuto = await graduationService.isAutonomous('org-1', 'x', 2);
    expect(isAuto).toBe(false);

    // 3. Record 20 approved outcomes → should graduate
    for (let i = 0; i < 20; i++) {
      await graduationService.recordOutcome('org-1', 'x', 2, true);
    }

    const isAutoNow = await graduationService.isAutonomous('org-1', 'x', 2);
    expect(isAutoNow).toBe(true);

    // 4. Record some rejections → should regress
    for (let i = 0; i < 3; i++) {
      await graduationService.recordOutcome('org-1', 'x', 2, false);
    }

    // 17/20 = 85% < 90% → regressed
    const isAutoAfterRegression = await graduationService.isAutonomous('org-1', 'x', 2);
    expect(isAutoAfterRegression).toBe(false);
  });

  it('classifies tiers correctly and handles boundary/escalation checks', () => {
    const engagementService = new EngagementService({} as any);
    const pipeline = new EngagementPipeline({} as any, {} as any);

    // Tier classification
    expect(engagementService.classifyTier('MENTION', 0.8, 'Love it!')).toBe(2);
    expect(engagementService.classifyTier('REPLY', 0.1, 'How does this work?')).toBe(3);
    expect(engagementService.classifyTier('COMMENT', -0.6, 'This is broken')).toBe(5);
    expect(engagementService.classifyTier('DM', 0.5, 'Hello')).toBe(5);

    // Boundary check
    expect(pipeline.shouldSkip('What about politics?', {
      boundaries: ['politics'],
      escalationPhrases: [],
    })).toBe(true);

    expect(pipeline.shouldSkip('How does AI work?', {
      boundaries: ['politics'],
      escalationPhrases: [],
    })).toBe(false);

    // Escalation check
    expect(pipeline.shouldEscalate('I want a refund', {
      boundaries: [],
      escalationPhrases: ['refund', 'lawsuit'],
    })).toBe(true);
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `cd libraries/engagement-engine && npx jest`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add libraries/engagement-engine/src/__tests__/
git commit -m "test(engagement): add integration test for full engagement flow"
```

---

## File Structure Summary

| Path | Purpose |
|------|---------|
| `libraries/engagement-engine/src/engagement.service.ts` | CRUD + tier classification |
| `libraries/engagement-engine/src/graduation.service.ts` | Trust graduation (supervised → autonomous) |
| `libraries/engagement-engine/src/engagement.pipeline.ts` | Response drafting with persona voice |
| `libraries/engagement-engine/src/engagement.interface.ts` | Shared types |
| `libraries/engagement-engine/src/graduation.interface.ts` | Graduation types + constants |
| `libraries/engagement-engine/src/engagement.module.ts` | NestJS module |
| `libraries/engagement-engine/src/index.ts` | Public exports |
| `apps/backend/src/public-api/routes/v1/public.engagement.controller.ts` | REST API |
| `apps/mcp-server/src/tools/engagement.ts` | MCP tools |
| `apps/orchestrator/src/workflows/engagement.workflow.ts` | Temporal polling workflow |
| `apps/orchestrator/src/activities/engagement.activity.ts` | Temporal activity |
| `apps/frontend/src/components/engagements/engagement-queue.tsx` | React UI |
| `apps/frontend/src/app/(app)/(site)/engagements/page.tsx` | Next.js route |
