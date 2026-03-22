import { NotFoundException } from '@nestjs/common';
import { ApprovalService } from '../approval.service';
import { PolicyService } from '../policy.service';
import {
  ApprovalStatus,
  ApprovalType,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    organizationId: 'org-1',
    type: ApprovalType.POST,
    status: ApprovalStatus.PENDING,
    payload: { platform: 'twitter', text: 'hello world' } as Record<string, unknown>,
    reason: null as string | null,
    riskScore: 0.3,
    personaId: null as string | null,
    agentSessionId: null as string | null,
    expiresAt: new Date('2099-01-01T00:00:00Z') as Date | null,
    decidedAt: null as Date | null,
    decidedBy: null as string | null,
    feedback: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPrisma() {
  return {
    approvalItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    approvalPolicy: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as any;
}

function buildPolicyService() {
  return {
    shouldRequireApproval: jest.fn().mockResolvedValue(true),
    getAutoExpireConfig: jest.fn().mockResolvedValue({
      hours: 24,
      action: ApprovalStatus.REJECTED,
    }),
    getPolicy: jest.fn(),
  } as unknown as PolicyService;
}

// ---------------------------------------------------------------------------
// ApprovalService
// ---------------------------------------------------------------------------

describe('ApprovalService', () => {
  // -------------------------------------------------------------------------
  // submit()
  // -------------------------------------------------------------------------

  describe('submit()', () => {
    it('creates a PENDING item when policy requires approval', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();
      (policy.shouldRequireApproval as jest.Mock).mockResolvedValue(true);
      (policy.getAutoExpireConfig as jest.Mock).mockResolvedValue({
        hours: 24,
        action: ApprovalStatus.REJECTED,
      });

      const createdItem = makeItem({ status: ApprovalStatus.PENDING });
      prisma.approvalItem.create.mockResolvedValue(createdItem);

      const svc = new ApprovalService(prisma, policy);
      const result = await svc.submit(
        'org-1',
        ApprovalType.POST,
        { platform: 'twitter', text: 'hello' },
        0.3
      );

      expect(result.status).toBe(ApprovalStatus.PENDING);

      // Verify create was called with PENDING status and expiresAt set
      const createCall = prisma.approvalItem.create.mock.calls[0][0];
      expect(createCall.data.status).toBe(ApprovalStatus.PENDING);
      expect(createCall.data.expiresAt).toBeInstanceOf(Date);
      expect(createCall.data.decidedAt).toBeUndefined();
      expect(createCall.data.decidedBy).toBeUndefined();
    });

    it('creates an AUTO_APPROVED item when policy does not require approval', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();
      (policy.shouldRequireApproval as jest.Mock).mockResolvedValue(false);

      const createdItem = makeItem({
        status: ApprovalStatus.AUTO_APPROVED,
        decidedAt: new Date(),
        decidedBy: 'system',
      });
      prisma.approvalItem.create.mockResolvedValue(createdItem);

      const svc = new ApprovalService(prisma, policy);
      const result = await svc.submit(
        'org-1',
        ApprovalType.POST,
        { platform: 'twitter', text: 'hello' },
        0.1
      );

      expect(result.status).toBe(ApprovalStatus.AUTO_APPROVED);

      const createCall = prisma.approvalItem.create.mock.calls[0][0];
      expect(createCall.data.status).toBe(ApprovalStatus.AUTO_APPROVED);
      expect(createCall.data.expiresAt).toBeNull();
      expect(createCall.data.decidedAt).toBeInstanceOf(Date);
      expect(createCall.data.decidedBy).toBe('system');
    });

    it('sets expiresAt based on auto-expire config hours', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();
      (policy.shouldRequireApproval as jest.Mock).mockResolvedValue(true);
      (policy.getAutoExpireConfig as jest.Mock).mockResolvedValue({
        hours: 48,
        action: ApprovalStatus.REJECTED,
      });

      prisma.approvalItem.create.mockImplementation((args: any) => Promise.resolve({
        ...makeItem(),
        ...args.data,
      }));

      const svc = new ApprovalService(prisma, policy);
      const before = Date.now();
      await svc.submit('org-1', ApprovalType.POST, { platform: 'twitter' }, 0.5);
      const after = Date.now();

      const createCall = prisma.approvalItem.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const expiresMs = expiresAt.getTime();

      // Should be ~48 hours from now (allow 5s tolerance)
      const expected48h = 48 * 60 * 60 * 1000;
      expect(expiresMs - before).toBeGreaterThan(expected48h - 5000);
      expect(expiresMs - after).toBeLessThan(expected48h + 5000);
    });
  });

  // -------------------------------------------------------------------------
  // decide()
  // -------------------------------------------------------------------------

  describe('decide()', () => {
    it('approves a pending item', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();
      const pendingItem = makeItem({ status: ApprovalStatus.PENDING });
      prisma.approvalItem.findUnique.mockResolvedValue(pendingItem);

      const updatedItem = makeItem({
        status: ApprovalStatus.APPROVED,
        decidedAt: new Date(),
        decidedBy: 'user-1',
        feedback: 'Looks good',
      });
      prisma.approvalItem.update.mockResolvedValue(updatedItem);

      const svc = new ApprovalService(prisma, policy);
      const result = await svc.decide('item-1', true, 'user-1', 'Looks good');

      expect(result.status).toBe(ApprovalStatus.APPROVED);

      const updateCall = prisma.approvalItem.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(ApprovalStatus.APPROVED);
      expect(updateCall.data.decidedBy).toBe('user-1');
      expect(updateCall.data.feedback).toBe('Looks good');
      expect(updateCall.data.decidedAt).toBeInstanceOf(Date);
    });

    it('rejects a pending item', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();
      prisma.approvalItem.findUnique.mockResolvedValue(
        makeItem({ status: ApprovalStatus.PENDING })
      );

      const updatedItem = makeItem({
        status: ApprovalStatus.REJECTED,
        decidedAt: new Date(),
        decidedBy: 'user-1',
      });
      prisma.approvalItem.update.mockResolvedValue(updatedItem);

      const svc = new ApprovalService(prisma, policy);
      const result = await svc.decide('item-1', false, 'user-1');

      expect(result.status).toBe(ApprovalStatus.REJECTED);
      const updateCall = prisma.approvalItem.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(ApprovalStatus.REJECTED);
      expect(updateCall.data.feedback).toBeNull();
    });

    it('throws NotFoundException for non-existent item', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();
      prisma.approvalItem.findUnique.mockResolvedValue(null);

      const svc = new ApprovalService(prisma, policy);
      await expect(
        svc.decide('nonexistent', true, 'user-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('throws for non-PENDING item (already decided)', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();
      prisma.approvalItem.findUnique.mockResolvedValue(
        makeItem({ status: ApprovalStatus.APPROVED })
      );

      const svc = new ApprovalService(prisma, policy);
      await expect(
        svc.decide('item-1', true, 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // getPending()
  // -------------------------------------------------------------------------

  describe('getPending()', () => {
    it('returns pending items ordered by createdAt asc', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();

      const items = [
        makeItem({ id: 'a', createdAt: new Date('2025-01-01') }),
        makeItem({ id: 'b', createdAt: new Date('2025-01-02') }),
      ];
      prisma.approvalItem.findMany.mockResolvedValue(items);

      const svc = new ApprovalService(prisma, policy);
      const result = await svc.getPending('org-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a');

      const findCall = prisma.approvalItem.findMany.mock.calls[0][0];
      expect(findCall.where.status).toBe(ApprovalStatus.PENDING);
      expect(findCall.orderBy).toEqual({ createdAt: 'asc' });
    });

    it('filters by type when provided', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();
      prisma.approvalItem.findMany.mockResolvedValue([]);

      const svc = new ApprovalService(prisma, policy);
      await svc.getPending('org-1', ApprovalType.REPLY);

      const findCall = prisma.approvalItem.findMany.mock.calls[0][0];
      expect(findCall.where.type).toBe(ApprovalType.REPLY);
    });
  });

  // -------------------------------------------------------------------------
  // expireStale()
  // -------------------------------------------------------------------------

  describe('expireStale()', () => {
    it('expires items past their deadline using correct expiration action', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();

      const staleItem = makeItem({
        id: 'stale-1',
        expiresAt: new Date('2020-01-01'),
        payload: { platform: 'twitter' },
        type: ApprovalType.POST,
      });
      prisma.approvalItem.findMany.mockResolvedValue([staleItem]);
      prisma.approvalItem.update.mockResolvedValue({
        ...staleItem,
        status: ApprovalStatus.EXPIRED,
      });

      (policy.getAutoExpireConfig as jest.Mock).mockResolvedValue({
        hours: 24,
        action: ApprovalStatus.EXPIRED,
      });

      const svc = new ApprovalService(prisma, policy);
      const count = await svc.expireStale();

      expect(count).toBe(1);

      const updateCall = prisma.approvalItem.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(ApprovalStatus.EXPIRED);
      expect(updateCall.data.decidedBy).toBe('system:auto-expire');
      expect(updateCall.data.decidedAt).toBeInstanceOf(Date);
    });

    it('returns 0 when no stale items exist', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();
      prisma.approvalItem.findMany.mockResolvedValue([]);

      const svc = new ApprovalService(prisma, policy);
      const count = await svc.expireStale();

      expect(count).toBe(0);
      expect(prisma.approvalItem.update).not.toHaveBeenCalled();
    });

    it('uses the correct expiration action from policy per item', async () => {
      const prisma = buildPrisma();
      const policy = buildPolicyService();

      const staleItems = [
        makeItem({
          id: 'stale-1',
          organizationId: 'org-1',
          payload: { platform: 'twitter' },
          type: ApprovalType.POST,
        }),
        makeItem({
          id: 'stale-2',
          organizationId: 'org-1',
          payload: { platform: 'linkedin' },
          type: ApprovalType.REPLY,
        }),
      ];
      prisma.approvalItem.findMany.mockResolvedValue(staleItems);
      prisma.approvalItem.update.mockImplementation((args: any) =>
        Promise.resolve({ ...staleItems[0], ...args.data })
      );

      (policy.getAutoExpireConfig as jest.Mock)
        .mockResolvedValueOnce({ hours: 24, action: ApprovalStatus.REJECTED })
        .mockResolvedValueOnce({ hours: 48, action: ApprovalStatus.AUTO_APPROVED });

      const svc = new ApprovalService(prisma, policy);
      const count = await svc.expireStale();

      expect(count).toBe(2);

      const firstUpdate = prisma.approvalItem.update.mock.calls[0][0];
      expect(firstUpdate.data.status).toBe(ApprovalStatus.REJECTED);

      const secondUpdate = prisma.approvalItem.update.mock.calls[1][0];
      expect(secondUpdate.data.status).toBe(ApprovalStatus.AUTO_APPROVED);
    });
  });
});
