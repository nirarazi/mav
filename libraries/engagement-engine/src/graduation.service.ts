import { Injectable, Logger } from '@nestjs/common';
import {
  AutonomyState,
  GraduationWindow,
  GRADUATION_THRESHOLD,
  REGRESSION_THRESHOLD,
  WINDOW_SIZE,
} from './graduation.interface';

@Injectable()
export class GraduationService {
  private readonly logger = new Logger(GraduationService.name);

  constructor(private readonly prisma: any) {}

  /**
   * Record the outcome (approved or rejected) of an agent action for a given
   * org/platform/tier combination. Maintains a rolling window of the last
   * WINDOW_SIZE outcomes and transitions autonomy status based on approval rate.
   */
  async recordOutcome(
    orgId: string,
    platform: string,
    tier: number,
    approved: boolean
  ): Promise<AutonomyState> {
    // Fetch existing record (may not exist yet)
    const existing = await this.prisma.engagementAutonomy.findUnique({
      where: {
        organizationId_platform_tier: {
          organizationId: orgId,
          platform,
          tier,
        },
      },
    });

    // Build the updated rolling window
    const currentWindow: GraduationWindow[] = existing?.window ?? [];
    const newEntry: GraduationWindow = {
      approved,
      timestamp: new Date().toISOString(),
    };
    const updatedWindow = [...currentWindow, newEntry].slice(-WINDOW_SIZE);

    // Compute approval rate
    const approvedCount = updatedWindow.filter((e) => e.approved).length;
    const approvalRate =
      updatedWindow.length > 0 ? approvedCount / updatedWindow.length : 0;

    // Determine new status
    const currentStatus: AutonomyState['status'] =
      existing?.status ?? 'SUPERVISED';
    let newStatus: AutonomyState['status'] = currentStatus;
    let graduatedAt: Date | null = existing?.graduatedAt ?? null;
    let regressedAt: Date | null = existing?.regressedAt ?? null;

    const windowFull = updatedWindow.length >= WINDOW_SIZE;

    if (windowFull && approvalRate >= GRADUATION_THRESHOLD) {
      if (newStatus !== 'AUTONOMOUS') {
        newStatus = 'AUTONOMOUS';
        graduatedAt = new Date();
        this.logger.log(
          `Org ${orgId} platform ${platform} tier ${tier} graduated to AUTONOMOUS (rate: ${approvalRate})`
        );
      }
    } else if (
      windowFull &&
      approvalRate < REGRESSION_THRESHOLD &&
      currentStatus === 'AUTONOMOUS'
    ) {
      newStatus = 'SUPERVISED';
      regressedAt = new Date();
      this.logger.log(
        `Org ${orgId} platform ${platform} tier ${tier} regressed to SUPERVISED (rate: ${approvalRate})`
      );
    }

    const record = await this.prisma.engagementAutonomy.upsert({
      where: {
        organizationId_platform_tier: {
          organizationId: orgId,
          platform,
          tier,
        },
      },
      create: {
        organizationId: orgId,
        platform,
        tier,
        status: newStatus,
        approvalRate,
        windowSize: updatedWindow.length,
        window: updatedWindow,
        graduatedAt,
        regressedAt,
      },
      update: {
        status: newStatus,
        approvalRate,
        windowSize: updatedWindow.length,
        window: updatedWindow,
        graduatedAt,
        regressedAt,
      },
    });

    return this.toAutonomyState(record);
  }

  /**
   * Returns true if the org/platform/tier combination is in AUTONOMOUS status.
   */
  async isAutonomous(
    orgId: string,
    platform: string,
    tier: number
  ): Promise<boolean> {
    const record = await this.prisma.engagementAutonomy.findUnique({
      where: {
        organizationId_platform_tier: {
          organizationId: orgId,
          platform,
          tier,
        },
      },
    });

    return record?.status === 'AUTONOMOUS';
  }

  /**
   * Returns all autonomy state records for an organization.
   */
  async getAutonomyStatus(orgId: string): Promise<AutonomyState[]> {
    const records = await this.prisma.engagementAutonomy.findMany({
      where: { organizationId: orgId },
    });

    return records.map((r: any) => this.toAutonomyState(r));
  }

  /**
   * Manually override the autonomy status and reset the rolling window.
   */
  async overrideStatus(
    orgId: string,
    platform: string,
    tier: number,
    status: AutonomyState['status']
  ): Promise<AutonomyState> {
    const record = await this.prisma.engagementAutonomy.upsert({
      where: {
        organizationId_platform_tier: {
          organizationId: orgId,
          platform,
          tier,
        },
      },
      create: {
        organizationId: orgId,
        platform,
        tier,
        status,
        approvalRate: 0,
        windowSize: 0,
        window: [],
        graduatedAt: null,
        regressedAt: null,
      },
      update: {
        status,
        approvalRate: 0,
        windowSize: 0,
        window: [],
        graduatedAt: null,
        regressedAt: null,
      },
    });

    this.logger.log(
      `Org ${orgId} platform ${platform} tier ${tier} status manually overridden to ${status}`
    );

    return this.toAutonomyState(record);
  }

  private toAutonomyState(record: any): AutonomyState {
    return {
      organizationId: record.organizationId,
      platform: record.platform,
      tier: record.tier,
      status: record.status,
      approvalRate: record.approvalRate,
      windowSize: record.windowSize,
      graduatedAt: record.graduatedAt
        ? record.graduatedAt instanceof Date
          ? record.graduatedAt.toISOString()
          : record.graduatedAt
        : null,
      regressedAt: record.regressedAt
        ? record.regressedAt instanceof Date
          ? record.regressedAt.toISOString()
          : record.regressedAt
        : null,
    };
  }
}
