import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@mav/nestjs-libraries/database/prisma/prisma.service';
import {
  ApprovalType,
  ApprovalPolicyType,
  ApprovalStatus,
  ApprovalPolicy,
} from '@prisma/client';
import { AutoExpireConfig } from './approval.interface';

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the applicable policy for a given org/platform/actionType combo.
   * Resolution order (most specific wins):
   *   1. platform + actionType match
   *   2. platform-only match (actionType null)
   *   3. actionType-only match (platform null)
   *   4. org-wide default (both null)
   * Falls back to ALWAYS_REQUIRE if no policy is configured.
   */
  async getPolicy(
    orgId: string,
    platform?: string,
    actionType?: ApprovalType
  ): Promise<ApprovalPolicyType> {
    const resolved = await this.resolvePolicy(orgId, platform, actionType);
    return resolved?.policy ?? ApprovalPolicyType.ALWAYS_REQUIRE;
  }

  /**
   * Create or update a policy for an org/platform/actionType combination.
   * Uses the unique constraint on [organizationId, platform, actionType].
   */
  async setPolicy(
    orgId: string,
    platform: string | null,
    actionType: ApprovalType | null,
    policy: ApprovalPolicyType,
    riskThreshold?: number
  ): Promise<ApprovalPolicy> {
    return this.prisma.approvalPolicy.upsert({
      where: {
        organizationId_platform_actionType: {
          organizationId: orgId,
          platform: platform,
          actionType: actionType,
        },
      },
      update: {
        policy,
        ...(riskThreshold !== undefined && { riskThreshold }),
      },
      create: {
        organizationId: orgId,
        platform,
        actionType,
        policy,
        riskThreshold: riskThreshold ?? 0.5,
      },
    });
  }

  /**
   * Determine whether an item needs human approval based on the resolved policy.
   *
   * Policy logic:
   * - ALWAYS_APPROVE  -> never requires approval (auto-approve)
   * - ALWAYS_REQUIRE  -> always requires approval
   * - RISK_BASED      -> requires approval when riskScore exceeds threshold
   * - FIRST_N         -> requires approval for the first N approved items in the org,
   *                      where N = riskThreshold (repurposed). After N items have been
   *                      approved, new items are auto-approved.
   * - SAMPLE          -> random sampling at a rate of riskThreshold (0..1).
   *                      e.g. 0.2 means ~20% of items require approval.
   */
  async shouldRequireApproval(
    orgId: string,
    platform: string | undefined,
    actionType: ApprovalType | undefined,
    riskScore: number
  ): Promise<boolean> {
    const resolved = await this.resolvePolicy(orgId, platform, actionType);

    if (!resolved) {
      // No policy configured at all — require approval by default
      return true;
    }

    switch (resolved.policy) {
      case ApprovalPolicyType.ALWAYS_APPROVE:
        return false;

      case ApprovalPolicyType.ALWAYS_REQUIRE:
        return true;

      case ApprovalPolicyType.RISK_BASED:
        return riskScore > resolved.riskThreshold;

      case ApprovalPolicyType.FIRST_N: {
        const requiredCount = Math.floor(resolved.riskThreshold);
        const approvedCount = await this.prisma.approvalItem.count({
          where: {
            organizationId: orgId,
            status: {
              in: [ApprovalStatus.APPROVED, ApprovalStatus.AUTO_APPROVED],
            },
          },
        });
        // Require approval until we've accumulated N approved items
        return approvedCount < requiredCount;
      }

      case ApprovalPolicyType.SAMPLE: {
        const sampleRate = Math.min(Math.max(resolved.riskThreshold, 0), 1);
        return Math.random() < sampleRate;
      }

      default:
        this.logger.warn(
          `Unknown policy type "${resolved.policy}" for org ${orgId}, defaulting to require approval`
        );
        return true;
    }
  }

  /**
   * Get the auto-expiration configuration for an org/platform/actionType.
   */
  async getAutoExpireConfig(
    orgId: string,
    platform?: string,
    actionType?: ApprovalType
  ): Promise<AutoExpireConfig> {
    const resolved = await this.resolvePolicy(orgId, platform, actionType);
    return {
      hours: resolved?.autoExpireHours ?? 24,
      action: resolved?.autoExpireAction ?? ApprovalStatus.REJECTED,
    };
  }

  /**
   * Resolve the most specific policy matching the given criteria.
   * Fetches all policies for the org in one query and picks the best match.
   */
  private async resolvePolicy(
    orgId: string,
    platform?: string,
    actionType?: ApprovalType
  ): Promise<ApprovalPolicy | null> {
    const policies = await this.prisma.approvalPolicy.findMany({
      where: { organizationId: orgId },
    });

    if (policies.length === 0) {
      return null;
    }

    // Score each policy by specificity: platform match = 2 pts, actionType match = 1 pt
    let bestPolicy: ApprovalPolicy | null = null;
    let bestScore = -1;

    for (const p of policies) {
      let score = 0;
      const platformMatches =
        p.platform === null || (platform && p.platform === platform);
      const actionMatches =
        p.actionType === null || (actionType && p.actionType === actionType);

      if (!platformMatches || !actionMatches) {
        continue;
      }

      if (p.platform !== null) score += 2;
      if (p.actionType !== null) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestPolicy = p;
      }
    }

    return bestPolicy;
  }
}
