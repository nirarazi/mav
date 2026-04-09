import { EngagementService } from '../engagement.service';
import { ClassifiedEngagement } from '../engagement.interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEngagement(overrides: Partial<ClassifiedEngagement> = {}): ClassifiedEngagement {
  return {
    organizationId: 'org-1',
    platform: 'twitter',
    externalId: 'ext-123',
    type: 'MENTION',
    incomingText: 'Great work!',
    authorName: 'Alice',
    authorHandle: '@alice',
    tier: 2,
    sentiment: 0.8,
    confidence: 0.9,
    ...overrides,
  };
}

function buildPrisma() {
  return {
    engagement: {
      create: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({
          id: 'eng-1',
          status: 'PENDING',
          createdAt: new Date(),
          ...args.data,
        })
      ),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({
          id: args.where?.id ?? 'eng-1',
          ...args.data,
        })
      ),
    },
  } as any;
}

// ---------------------------------------------------------------------------
// EngagementService
// ---------------------------------------------------------------------------

describe('EngagementService', () => {
  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------

  describe('create()', () => {
    it('creates an engagement record with PENDING status', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);
      const input = makeEngagement();

      const result = await svc.create(input);

      expect(prisma.engagement.create).toHaveBeenCalledTimes(1);
      const createCall = prisma.engagement.create.mock.calls[0][0];
      expect(createCall.data.organizationId).toBe('org-1');
      expect(createCall.data.platform).toBe('twitter');
      expect(createCall.data.externalId).toBe('ext-123');
      expect(createCall.data.type).toBe('MENTION');
      expect(createCall.data.tier).toBe(2);
      expect(createCall.data.sentiment).toBe(0.8);
      expect(createCall.data.confidence).toBe(0.9);
      expect(createCall.data.status).toBe('PENDING');
      expect(result.status).toBe('PENDING');
    });
  });

  // -------------------------------------------------------------------------
  // findByOrg()
  // -------------------------------------------------------------------------

  describe('findByOrg()', () => {
    it('returns engagements for an org ordered by createdAt desc', async () => {
      const prisma = buildPrisma();
      prisma.engagement.findMany.mockResolvedValue([
        { id: 'eng-1', organizationId: 'org-1' },
        { id: 'eng-2', organizationId: 'org-1' },
      ]);
      const svc = new EngagementService(prisma);

      const result = await svc.findByOrg('org-1');

      expect(result).toHaveLength(2);
      const findCall = prisma.engagement.findMany.mock.calls[0][0];
      expect(findCall.where.organizationId).toBe('org-1');
      expect(findCall.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('applies platform filter to Prisma where clause', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);

      await svc.findByOrg('org-1', { platform: 'twitter' });

      const findCall = prisma.engagement.findMany.mock.calls[0][0];
      expect(findCall.where.platform).toBe('twitter');
    });

    it('applies tier filter to Prisma where clause', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);

      await svc.findByOrg('org-1', { tier: 3 });

      const findCall = prisma.engagement.findMany.mock.calls[0][0];
      expect(findCall.where.tier).toBe(3);
    });

    it('applies status filter to Prisma where clause', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);

      await svc.findByOrg('org-1', { status: 'RESPONDED' });

      const findCall = prisma.engagement.findMany.mock.calls[0][0];
      expect(findCall.where.status).toBe('RESPONDED');
    });

    it('passes skip and take for pagination', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);

      await svc.findByOrg('org-1', { skip: 10, take: 20 });

      const findCall = prisma.engagement.findMany.mock.calls[0][0];
      expect(findCall.skip).toBe(10);
      expect(findCall.take).toBe(20);
    });

    it('applies dateFrom filter to Prisma where clause', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);
      const dateFrom = new Date('2026-01-01');

      await svc.findByOrg('org-1', { dateFrom });

      const findCall = prisma.engagement.findMany.mock.calls[0][0];
      expect(findCall.where.createdAt).toBeDefined();
      expect(findCall.where.createdAt.gte).toBe(dateFrom);
    });

    it('applies dateTo filter to Prisma where clause', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);
      const dateTo = new Date('2026-12-31');

      await svc.findByOrg('org-1', { dateTo });

      const findCall = prisma.engagement.findMany.mock.calls[0][0];
      expect(findCall.where.createdAt).toBeDefined();
      expect(findCall.where.createdAt.lte).toBe(dateTo);
    });

    it('applies dateFrom and dateTo combined filter to Prisma where clause', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);
      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-12-31');

      await svc.findByOrg('org-1', { dateFrom, dateTo });

      const findCall = prisma.engagement.findMany.mock.calls[0][0];
      expect(findCall.where.createdAt).toBeDefined();
      expect(findCall.where.createdAt.gte).toBe(dateFrom);
      expect(findCall.where.createdAt.lte).toBe(dateTo);
    });

    it('does not add undefined filter keys when no filters provided', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);

      await svc.findByOrg('org-1');

      const findCall = prisma.engagement.findMany.mock.calls[0][0];
      expect(findCall.where).not.toHaveProperty('platform');
      expect(findCall.where).not.toHaveProperty('tier');
      expect(findCall.where).not.toHaveProperty('status');
    });
  });

  // -------------------------------------------------------------------------
  // markResponded()
  // -------------------------------------------------------------------------

  describe('markResponded()', () => {
    it('updates status to RESPONDED, sets responseText and respondedAt', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);

      const result = await svc.markResponded('eng-1', 'Thanks for the mention!');

      expect(prisma.engagement.update).toHaveBeenCalledTimes(1);
      const updateCall = prisma.engagement.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe('eng-1');
      expect(updateCall.data.status).toBe('RESPONDED');
      expect(updateCall.data.responseText).toBe('Thanks for the mention!');
      expect(updateCall.data.respondedAt).toBeInstanceOf(Date);
      expect(result.status).toBe('RESPONDED');
    });

    it('includes approvalId when provided', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);

      await svc.markResponded('eng-1', 'Response text', 'approval-42');

      const updateCall = prisma.engagement.update.mock.calls[0][0];
      expect(updateCall.data.approvalId).toBe('approval-42');
    });

    it('does not include approvalId key when not provided', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);

      await svc.markResponded('eng-1', 'Response text');

      const updateCall = prisma.engagement.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('approvalId');
    });
  });

  // -------------------------------------------------------------------------
  // markSkipped()
  // -------------------------------------------------------------------------

  describe('markSkipped()', () => {
    it('updates status to SKIPPED', async () => {
      const prisma = buildPrisma();
      const svc = new EngagementService(prisma);

      const result = await svc.markSkipped('eng-1');

      expect(prisma.engagement.update).toHaveBeenCalledTimes(1);
      const updateCall = prisma.engagement.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe('eng-1');
      expect(updateCall.data.status).toBe('SKIPPED');
      expect(result.status).toBe('SKIPPED');
    });
  });

  // -------------------------------------------------------------------------
  // classifyTier()
  // -------------------------------------------------------------------------

  describe('classifyTier()', () => {
    it('positive mentions with short text → tier 2 (acknowledgment)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('MENTION', 0.8, 'Great work!');
      expect(tier).toBe(2);
    });

    it('positive replies with short text → tier 2 (acknowledgment)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('REPLY', 0.6, 'Love this!');
      expect(tier).toBe(2);
    });

    it('text containing question mark → tier 3 (conversational)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('MENTION', 0.1, 'Can you help me?');
      expect(tier).toBe(3);
    });

    it('text starting with question word → tier 3 (conversational)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('MENTION', 0.1, 'How do you do this feature');
      expect(tier).toBe(3);
    });

    it('text starting with "what" → tier 3 (conversational)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('COMMENT', 0.0, 'What is the pricing');
      expect(tier).toBe(3);
    });

    it('negative sentiment below -0.3 → tier 5 (sensitive)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('MENTION', -0.5, 'This is terrible service!');
      expect(tier).toBe(5);
    });

    it('negative sentiment at exactly -0.3 is not sensitive (boundary)', () => {
      const svc = new EngagementService({} as any);
      // -0.3 is NOT less than -0.3, so should not be tier 5 via this rule
      const tier = svc.classifyTier('MENTION', -0.3, 'Neutral content here');
      expect(tier).not.toBe(5);
    });

    it('DM type → tier 5 (sensitive) regardless of sentiment', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('DM', 0.9, 'Hey love your product!');
      expect(tier).toBe(5);
    });

    it('DM with negative sentiment → tier 5 (DM rule takes priority)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('DM', -0.8, 'I hate this!');
      expect(tier).toBe(5);
    });

    it('QUOTE type → tier 4 (proactive)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('QUOTE', 0.2, 'Sharing this great insight');
      expect(tier).toBe(4);
    });

    it('QUOTE with positive sentiment → still tier 4 (QUOTE rule takes priority)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('QUOTE', 0.9, 'Amazing!');
      expect(tier).toBe(4);
    });

    it('long text (>=200 chars) with neutral sentiment → tier 3 (conversational)', () => {
      const svc = new EngagementService({} as any);
      const longText = 'A'.repeat(200);
      const tier = svc.classifyTier('MENTION', 0.0, longText);
      expect(tier).toBe(3);
    });

    it('COMMENT with neutral short text → tier 3 (fallback)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('COMMENT', 0.0, 'Interesting post');
      expect(tier).toBe(3);
    });

    it('emoji-only text with neutral sentiment → tier 1 (passive)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('COMMENT', 0.0, '👍🔥');
      expect(tier).toBe(1);
    });

    it('empty text with positive sentiment → tier 1 (passive)', () => {
      const svc = new EngagementService({} as any);
      const tier = svc.classifyTier('MENTION', 0.5, '');
      expect(tier).toBe(1);
    });
  });
});
