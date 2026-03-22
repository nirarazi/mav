import { PolicyService } from '../policy.service';
import {
  ApprovalPolicyType,
  ApprovalStatus,
  ApprovalType,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePolicy(overrides: Record<string, unknown> = {}) {
  return {
    id: 'policy-1',
    organizationId: 'org-1',
    platform: null as string | null,
    actionType: null as ApprovalType | null,
    policy: ApprovalPolicyType.ALWAYS_REQUIRE,
    riskThreshold: 0.5,
    autoExpireHours: 24,
    autoExpireAction: ApprovalStatus.REJECTED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPrisma() {
  return {
    approvalPolicy: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    approvalItem: {
      count: jest.fn().mockResolvedValue(0),
    },
  } as any;
}

// ---------------------------------------------------------------------------
// getPolicy()
// ---------------------------------------------------------------------------

describe('PolicyService', () => {
  describe('getPolicy()', () => {
    it('returns ALWAYS_REQUIRE when no policies are configured', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([]);
      const svc = new PolicyService(prisma);

      const result = await svc.getPolicy('org-1', 'twitter', ApprovalType.POST);
      expect(result).toBe(ApprovalPolicyType.ALWAYS_REQUIRE);
    });

    it('returns exact match when platform + actionType both match', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          platform: 'twitter',
          actionType: ApprovalType.POST,
          policy: ApprovalPolicyType.ALWAYS_APPROVE,
        }),
      ]);
      const svc = new PolicyService(prisma);

      const result = await svc.getPolicy('org-1', 'twitter', ApprovalType.POST);
      expect(result).toBe(ApprovalPolicyType.ALWAYS_APPROVE);
    });

    it('matches platform-only policy (actionType null in policy)', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          platform: 'twitter',
          actionType: null,
          policy: ApprovalPolicyType.RISK_BASED,
        }),
      ]);
      const svc = new PolicyService(prisma);

      const result = await svc.getPolicy('org-1', 'twitter', ApprovalType.POST);
      expect(result).toBe(ApprovalPolicyType.RISK_BASED);
    });

    it('matches actionType-only policy (platform null in policy)', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          platform: null,
          actionType: ApprovalType.REPLY,
          policy: ApprovalPolicyType.SAMPLE,
        }),
      ]);
      const svc = new PolicyService(prisma);

      const result = await svc.getPolicy('org-1', 'twitter', ApprovalType.REPLY);
      expect(result).toBe(ApprovalPolicyType.SAMPLE);
    });

    it('matches org-wide default (both null in policy)', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          platform: null,
          actionType: null,
          policy: ApprovalPolicyType.FIRST_N,
        }),
      ]);
      const svc = new PolicyService(prisma);

      const result = await svc.getPolicy('org-1', 'twitter', ApprovalType.POST);
      expect(result).toBe(ApprovalPolicyType.FIRST_N);
    });

    it('picks highest specificity: platform+action (3) > platform-only (2) > action-only (1) > org-wide (0)', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          id: 'p-orgwide',
          platform: null,
          actionType: null,
          policy: ApprovalPolicyType.ALWAYS_REQUIRE,
        }),
        makePolicy({
          id: 'p-action',
          platform: null,
          actionType: ApprovalType.POST,
          policy: ApprovalPolicyType.FIRST_N,
        }),
        makePolicy({
          id: 'p-platform',
          platform: 'twitter',
          actionType: null,
          policy: ApprovalPolicyType.RISK_BASED,
        }),
        makePolicy({
          id: 'p-exact',
          platform: 'twitter',
          actionType: ApprovalType.POST,
          policy: ApprovalPolicyType.ALWAYS_APPROVE,
        }),
      ]);
      const svc = new PolicyService(prisma);

      // Most specific (platform + actionType) should win
      const result = await svc.getPolicy('org-1', 'twitter', ApprovalType.POST);
      expect(result).toBe(ApprovalPolicyType.ALWAYS_APPROVE);
    });

    it('picks platform-only (2) over action-only (1) when no exact match', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          id: 'p-action',
          platform: null,
          actionType: ApprovalType.POST,
          policy: ApprovalPolicyType.FIRST_N,
        }),
        makePolicy({
          id: 'p-platform',
          platform: 'twitter',
          actionType: null,
          policy: ApprovalPolicyType.RISK_BASED,
        }),
      ]);
      const svc = new PolicyService(prisma);

      const result = await svc.getPolicy('org-1', 'twitter', ApprovalType.POST);
      expect(result).toBe(ApprovalPolicyType.RISK_BASED);
    });
  });

  // ---------------------------------------------------------------------------
  // shouldRequireApproval()
  // ---------------------------------------------------------------------------

  describe('shouldRequireApproval()', () => {
    it('ALWAYS_APPROVE returns false', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({ policy: ApprovalPolicyType.ALWAYS_APPROVE }),
      ]);
      const svc = new PolicyService(prisma);

      const result = await svc.shouldRequireApproval('org-1', undefined, undefined, 0.9);
      expect(result).toBe(false);
    });

    it('ALWAYS_REQUIRE returns true', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({ policy: ApprovalPolicyType.ALWAYS_REQUIRE }),
      ]);
      const svc = new PolicyService(prisma);

      const result = await svc.shouldRequireApproval('org-1', undefined, undefined, 0.1);
      expect(result).toBe(true);
    });

    it('RISK_BASED returns true when riskScore > threshold', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          policy: ApprovalPolicyType.RISK_BASED,
          riskThreshold: 0.5,
        }),
      ]);
      const svc = new PolicyService(prisma);

      expect(await svc.shouldRequireApproval('org-1', undefined, undefined, 0.8)).toBe(true);
    });

    it('RISK_BASED returns false when riskScore <= threshold', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          policy: ApprovalPolicyType.RISK_BASED,
          riskThreshold: 0.5,
        }),
      ]);
      const svc = new PolicyService(prisma);

      expect(await svc.shouldRequireApproval('org-1', undefined, undefined, 0.3)).toBe(false);
      expect(await svc.shouldRequireApproval('org-1', undefined, undefined, 0.5)).toBe(false);
    });

    it('FIRST_N returns true when fewer than N items approved', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          policy: ApprovalPolicyType.FIRST_N,
          riskThreshold: 5, // first 5 need approval
        }),
      ]);
      prisma.approvalItem.count.mockResolvedValue(3);
      const svc = new PolicyService(prisma);

      expect(await svc.shouldRequireApproval('org-1', undefined, undefined, 0)).toBe(true);
    });

    it('FIRST_N returns false after N items have been approved', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          policy: ApprovalPolicyType.FIRST_N,
          riskThreshold: 5,
        }),
      ]);
      prisma.approvalItem.count.mockResolvedValue(5);
      const svc = new PolicyService(prisma);

      expect(await svc.shouldRequireApproval('org-1', undefined, undefined, 0)).toBe(false);
    });

    it('SAMPLE returns true when Math.random < sampleRate', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          policy: ApprovalPolicyType.SAMPLE,
          riskThreshold: 0.2, // 20% sample rate
        }),
      ]);
      const svc = new PolicyService(prisma);

      const spy = jest.spyOn(Math, 'random').mockReturnValue(0.1);
      expect(await svc.shouldRequireApproval('org-1', undefined, undefined, 0)).toBe(true);
      spy.mockRestore();
    });

    it('SAMPLE returns false when Math.random >= sampleRate', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          policy: ApprovalPolicyType.SAMPLE,
          riskThreshold: 0.2,
        }),
      ]);
      const svc = new PolicyService(prisma);

      const spy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      expect(await svc.shouldRequireApproval('org-1', undefined, undefined, 0)).toBe(false);
      spy.mockRestore();
    });

    it('returns true (safe default) when no policy is configured', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([]);
      const svc = new PolicyService(prisma);

      expect(await svc.shouldRequireApproval('org-1', undefined, undefined, 0)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getAutoExpireConfig()
  // ---------------------------------------------------------------------------

  describe('getAutoExpireConfig()', () => {
    it('returns policy autoExpireHours and autoExpireAction when configured', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([
        makePolicy({
          autoExpireHours: 48,
          autoExpireAction: ApprovalStatus.AUTO_APPROVED,
        }),
      ]);
      const svc = new PolicyService(prisma);

      const config = await svc.getAutoExpireConfig('org-1');
      expect(config.hours).toBe(48);
      expect(config.action).toBe(ApprovalStatus.AUTO_APPROVED);
    });

    it('returns defaults (24h, REJECTED) when no policy exists', async () => {
      const prisma = buildPrisma();
      prisma.approvalPolicy.findMany.mockResolvedValue([]);
      const svc = new PolicyService(prisma);

      const config = await svc.getAutoExpireConfig('org-1');
      expect(config.hours).toBe(24);
      expect(config.action).toBe(ApprovalStatus.REJECTED);
    });
  });
});
