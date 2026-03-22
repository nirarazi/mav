import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@maverick/nestjs-libraries/src/database/prisma/prisma.service';
import {
  ApprovalItem,
  ApprovalStatus,
  ApprovalType,
} from '@prisma/client';
import { PolicyService } from './policy.service';
import { ApprovalHistoryFilters } from './approval.interface';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: PolicyService
  ) {}

  /**
   * Submit an item for approval. Checks the applicable policy first:
   * - If the policy says no approval is needed, the item is created with AUTO_APPROVED status.
   * - Otherwise, it's created as PENDING with an expiration deadline from the policy.
   */
  async submit(
    orgId: string,
    type: ApprovalType,
    payload: Record<string, unknown>,
    riskScore: number,
    personaId?: string,
    agentSessionId?: string
  ): Promise<ApprovalItem> {
    // Extract platform from payload if present, for policy resolution
    const platform = (payload.platform as string) ?? undefined;

    const needsApproval = await this.policyService.shouldRequireApproval(
      orgId,
      platform,
      type,
      riskScore
    );

    const expireConfig = await this.policyService.getAutoExpireConfig(
      orgId,
      platform,
      type
    );

    const expiresAt = needsApproval
      ? dayjs.utc().add(expireConfig.hours, 'hour').toDate()
      : null;

    const item = await this.prisma.approvalItem.create({
      data: {
        organizationId: orgId,
        type,
        status: needsApproval
          ? ApprovalStatus.PENDING
          : ApprovalStatus.AUTO_APPROVED,
        payload: payload as any,
        riskScore,
        personaId: personaId ?? null,
        agentSessionId: agentSessionId ?? null,
        expiresAt,
        ...(needsApproval
          ? {}
          : { decidedAt: new Date(), decidedBy: 'system' }),
      },
    });

    this.logger.log(
      `Approval item ${item.id} created for org ${orgId} — ${needsApproval ? 'PENDING' : 'AUTO_APPROVED'} (risk: ${riskScore})`
    );

    return item;
  }

  /**
   * Record an approval or rejection decision on a pending item.
   */
  async decide(
    itemId: string,
    approved: boolean,
    decidedBy: string,
    feedback?: string
  ): Promise<ApprovalItem> {
    const item = await this.prisma.approvalItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Approval item ${itemId} not found`);
    }

    if (item.status !== ApprovalStatus.PENDING) {
      throw new NotFoundException(
        `Approval item ${itemId} is not pending (current status: ${item.status})`
      );
    }

    const updated = await this.prisma.approvalItem.update({
      where: { id: itemId },
      data: {
        status: approved
          ? ApprovalStatus.APPROVED
          : ApprovalStatus.REJECTED,
        decidedAt: new Date(),
        decidedBy,
        feedback: feedback ?? null,
      },
    });

    this.logger.log(
      `Approval item ${itemId} ${approved ? 'APPROVED' : 'REJECTED'} by ${decidedBy}`
    );

    return updated;
  }

  /**
   * Get all pending approval items for an organization, optionally filtered by type.
   */
  async getPending(
    orgId: string,
    type?: ApprovalType
  ): Promise<ApprovalItem[]> {
    return this.prisma.approvalItem.findMany({
      where: {
        organizationId: orgId,
        status: ApprovalStatus.PENDING,
        ...(type && { type }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get approval history for an organization with optional filters.
   */
  async getHistory(
    orgId: string,
    filters: ApprovalHistoryFilters
  ): Promise<ApprovalItem[]> {
    const { type, status, from, to, personaId, skip, take } = filters;

    return this.prisma.approvalItem.findMany({
      where: {
        organizationId: orgId,
        ...(type && { type }),
        ...(status && { status }),
        ...(personaId && { personaId }),
        ...(from || to
          ? {
              createdAt: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: skip ?? 0,
      take: take ?? 50,
    });
  }

  /**
   * Expire stale pending items that are past their deadline.
   * Each item's expiration action is determined by the policy that was active
   * for the item's org at the time of expiration.
   *
   * Should be called periodically (e.g., every 5 minutes via a cron job).
   */
  async expireStale(): Promise<number> {
    const now = new Date();

    // Find all pending items whose expiresAt has passed
    const staleItems = await this.prisma.approvalItem.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        expiresAt: {
          lte: now,
        },
      },
    });

    if (staleItems.length === 0) {
      return 0;
    }

    let expiredCount = 0;

    for (const item of staleItems) {
      const platform = (item.payload as any)?.platform ?? undefined;
      const expireConfig = await this.policyService.getAutoExpireConfig(
        item.organizationId,
        platform,
        item.type
      );

      await this.prisma.approvalItem.update({
        where: { id: item.id },
        data: {
          status: expireConfig.action,
          decidedAt: now,
          decidedBy: 'system:auto-expire',
          feedback: `Auto-expired after ${expireConfig.hours}h deadline`,
        },
      });

      expiredCount++;
    }

    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} stale approval items`);
    }

    return expiredCount;
  }
}
