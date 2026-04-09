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
        const record = { id: `eng-${Date.now()}-${Math.random()}`, ...data, createdAt: new Date() };
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
      findFirst: jest.fn(({ where }) => {
        const all = Array.from(engagements.values());
        return Promise.resolve(all.find((e) => e.id === where.id && e.organizationId === where.organizationId) ?? null);
      }),
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
