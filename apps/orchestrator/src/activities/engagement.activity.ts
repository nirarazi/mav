import { Injectable, Logger } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { PrismaService } from '@mav/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
@Activity()
export class EngagementActivity {
  private readonly logger = new Logger(EngagementActivity.name);

  constructor(private readonly prisma: PrismaService) {}

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
      }

      this.logger.log(`Polled ${result.platforms.length} platforms, discovered ${result.discovered} new engagements`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      this.logger.error(`Poll failed for org ${orgId}: ${message}`);
    }

    return result;
  }

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
