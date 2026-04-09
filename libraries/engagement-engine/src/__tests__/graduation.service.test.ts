import { GraduationService } from '../graduation.service';
import { WINDOW_SIZE } from '../graduation.interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: 'org-1',
    platform: 'twitter',
    tier: 1,
    status: 'SUPERVISED',
    approvalRate: 0,
    windowSize: 0,
    window: [],
    graduatedAt: null,
    regressedAt: null,
    ...overrides,
  };
}

function buildPrisma() {
  return {
    engagementAutonomy: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({
          organizationId: args.create?.organizationId ?? args.update?.organizationId ?? 'org-1',
          platform: args.create?.platform ?? args.update?.platform ?? 'twitter',
          tier: args.create?.tier ?? args.update?.tier ?? 1,
          status: args.update?.status ?? args.create?.status ?? 'SUPERVISED',
          approvalRate: args.update?.approvalRate ?? args.create?.approvalRate ?? 0,
          windowSize: args.update?.windowSize ?? args.create?.windowSize ?? 0,
          window: args.update?.window ?? args.create?.window ?? [],
          graduatedAt: args.update?.graduatedAt ?? args.create?.graduatedAt ?? null,
          regressedAt: args.update?.regressedAt ?? args.create?.regressedAt ?? null,
        })
      ),
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as any;
}

// ---------------------------------------------------------------------------
// GraduationService
// ---------------------------------------------------------------------------

describe('GraduationService', () => {
  // -------------------------------------------------------------------------
  // recordOutcome()
  // -------------------------------------------------------------------------

  describe('recordOutcome()', () => {
    it('appends outcome to the rolling window', async () => {
      const prisma = buildPrisma();
      const existingWindow = [{ approved: true, timestamp: '2025-01-01T00:00:00.000Z' }];
      prisma.engagementAutonomy.findUnique.mockResolvedValue(
        makeRecord({ window: existingWindow, windowSize: 1 })
      );

      const svc = new GraduationService(prisma);
      await svc.recordOutcome('org-1', 'twitter', 1, false);

      const upsertCall = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      expect(upsertCall.update.window).toHaveLength(2);
      expect(upsertCall.update.window[0].approved).toBe(true);
      expect(upsertCall.update.window[1].approved).toBe(false);
    });

    it('trims window to last 20 entries', async () => {
      const prisma = buildPrisma();
      // Pre-populate with 20 entries
      const fullWindow = Array.from({ length: WINDOW_SIZE }, (_, i) => ({
        approved: true,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
      }));
      prisma.engagementAutonomy.findUnique.mockResolvedValue(
        makeRecord({ window: fullWindow, windowSize: WINDOW_SIZE })
      );

      const svc = new GraduationService(prisma);
      await svc.recordOutcome('org-1', 'twitter', 1, false);

      const upsertCall = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      expect(upsertCall.update.window).toHaveLength(WINDOW_SIZE);
      // The new entry (false) should be the last one
      expect(upsertCall.update.window[WINDOW_SIZE - 1].approved).toBe(false);
    });

    it('graduates to AUTONOMOUS when approval rate hits 95% over full window', async () => {
      const prisma = buildPrisma();
      // Build a window of 19 approved entries — adding one more approved gives 20/20 = 100%
      const nearFullWindow = Array.from({ length: 19 }, () => ({
        approved: true,
        timestamp: new Date().toISOString(),
      }));
      prisma.engagementAutonomy.findUnique.mockResolvedValue(
        makeRecord({ window: nearFullWindow, windowSize: 19, status: 'SUPERVISED' })
      );

      const svc = new GraduationService(prisma);
      const result = await svc.recordOutcome('org-1', 'twitter', 1, true);

      expect(result.status).toBe('AUTONOMOUS');

      const upsertCall = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      expect(upsertCall.update.status).toBe('AUTONOMOUS');
      expect(upsertCall.update.graduatedAt).toBeInstanceOf(Date);
    });

    it('regresses to SUPERVISED when approval rate drops below 90% while AUTONOMOUS', async () => {
      const prisma = buildPrisma();
      // Build a window of 19 entries — 17 approved, 2 rejected
      // Adding one more rejected gives: 17/20 = 85% < 90% → regress
      const window19 = [
        ...Array.from({ length: 17 }, () => ({ approved: true, timestamp: new Date().toISOString() })),
        ...Array.from({ length: 2 }, () => ({ approved: false, timestamp: new Date().toISOString() })),
      ];
      prisma.engagementAutonomy.findUnique.mockResolvedValue(
        makeRecord({ window: window19, windowSize: 19, status: 'AUTONOMOUS' })
      );

      const svc = new GraduationService(prisma);
      const result = await svc.recordOutcome('org-1', 'twitter', 1, false);

      expect(result.status).toBe('SUPERVISED');

      const upsertCall = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      expect(upsertCall.update.status).toBe('SUPERVISED');
      expect(upsertCall.update.regressedAt).toBeInstanceOf(Date);
    });

    it('creates new record via upsert when none exists', async () => {
      const prisma = buildPrisma();
      // findUnique returns null → no existing record
      prisma.engagementAutonomy.findUnique.mockResolvedValue(null);

      const svc = new GraduationService(prisma);
      await svc.recordOutcome('org-1', 'twitter', 1, true);

      expect(prisma.engagementAutonomy.upsert).toHaveBeenCalledTimes(1);
      const upsertCall = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      // create branch should be populated
      expect(upsertCall.create.organizationId).toBe('org-1');
      expect(upsertCall.create.platform).toBe('twitter');
      expect(upsertCall.create.tier).toBe(1);
      expect(upsertCall.create.window).toHaveLength(1);
      expect(upsertCall.create.window[0].approved).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // isAutonomous()
  // -------------------------------------------------------------------------

  describe('isAutonomous()', () => {
    it('returns false when no record exists', async () => {
      const prisma = buildPrisma();
      prisma.engagementAutonomy.findUnique.mockResolvedValue(null);

      const svc = new GraduationService(prisma);
      const result = await svc.isAutonomous('org-1', 'twitter', 1);

      expect(result).toBe(false);
    });

    it('returns true when status is AUTONOMOUS', async () => {
      const prisma = buildPrisma();
      prisma.engagementAutonomy.findUnique.mockResolvedValue(
        makeRecord({ status: 'AUTONOMOUS' })
      );

      const svc = new GraduationService(prisma);
      const result = await svc.isAutonomous('org-1', 'twitter', 1);

      expect(result).toBe(true);
    });

    it('returns false when status is SUPERVISED', async () => {
      const prisma = buildPrisma();
      prisma.engagementAutonomy.findUnique.mockResolvedValue(
        makeRecord({ status: 'SUPERVISED' })
      );

      const svc = new GraduationService(prisma);
      const result = await svc.isAutonomous('org-1', 'twitter', 1);

      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getAutonomyStatus()
  // -------------------------------------------------------------------------

  describe('getAutonomyStatus()', () => {
    it('returns all tier+platform combinations for an org', async () => {
      const prisma = buildPrisma();
      prisma.engagementAutonomy.findMany.mockResolvedValue([
        makeRecord({ platform: 'twitter', tier: 1, status: 'AUTONOMOUS' }),
        makeRecord({ platform: 'linkedin', tier: 1, status: 'SUPERVISED' }),
        makeRecord({ platform: 'twitter', tier: 2, status: 'GRADUATING' }),
      ]);

      const svc = new GraduationService(prisma);
      const result = await svc.getAutonomyStatus('org-1');

      expect(result).toHaveLength(3);

      const findCall = prisma.engagementAutonomy.findMany.mock.calls[0][0];
      expect(findCall.where.organizationId).toBe('org-1');
    });

    it('returns empty array when org has no autonomy records', async () => {
      const prisma = buildPrisma();
      prisma.engagementAutonomy.findMany.mockResolvedValue([]);

      const svc = new GraduationService(prisma);
      const result = await svc.getAutonomyStatus('org-1');

      expect(result).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // overrideStatus()
  // -------------------------------------------------------------------------

  describe('overrideStatus()', () => {
    it('overrides status and resets window', async () => {
      const prisma = buildPrisma();

      const svc = new GraduationService(prisma);
      const result = await svc.overrideStatus('org-1', 'twitter', 1, 'AUTONOMOUS');

      expect(result.status).toBe('AUTONOMOUS');

      const upsertCall = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      expect(upsertCall.update.status).toBe('AUTONOMOUS');
      expect(upsertCall.update.window).toEqual([]);
      expect(upsertCall.update.approvalRate).toBe(0);
      expect(upsertCall.update.windowSize).toBe(0);
      expect(upsertCall.update.graduatedAt).toBeNull();
      expect(upsertCall.update.regressedAt).toBeNull();
    });

    it('can override back to SUPERVISED', async () => {
      const prisma = buildPrisma();

      const svc = new GraduationService(prisma);
      const result = await svc.overrideStatus('org-1', 'linkedin', 2, 'SUPERVISED');

      expect(result.status).toBe('SUPERVISED');

      const upsertCall = prisma.engagementAutonomy.upsert.mock.calls[0][0];
      expect(upsertCall.update.status).toBe('SUPERVISED');
      expect(upsertCall.create.platform).toBe('linkedin');
      expect(upsertCall.create.tier).toBe(2);
    });
  });
});
