import { Injectable, Logger } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { PrismaService } from '@maverick/nestjs-libraries/database/prisma/prisma.service';

/**
 * Brain Activity — Temporal activity that runs the OODA content generation cycle.
 *
 * This is the bridge between Temporal's workflow sandbox and the NestJS application.
 * The actual content generation logic lives in ContentPipeline (apps/agent-brain/).
 * This activity fetches goals, determines what to post, and calls the pipeline.
 */
@Injectable()
@Activity()
export class BrainActivity {
  private readonly logger = new Logger(BrainActivity.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run a single OODA cycle for an organization.
   * Called by the brain workflow on a scheduled basis.
   *
   * Returns the number of posts generated and queued for approval.
   */
  @ActivityMethod()
  async runOodaCycle(orgId: string): Promise<{
    postsGenerated: number;
    platforms: string[];
    errors: string[];
  }> {
    this.logger.log(`Starting OODA cycle for org ${orgId}`);

    const result = {
      postsGenerated: 0,
      platforms: [] as string[],
      errors: [] as string[],
    };

    try {
      // OBSERVE: Get the org's active goals and integrations
      const [goals, integrations, persona] = await Promise.all([
        this.prisma.goal.findMany({
          where: { organizationId: orgId, isActive: true },
        }),
        this.prisma.integration.findMany({
          where: { organizationId: orgId, disabled: false },
        }),
        this.prisma.persona.findFirst({
          where: { organizationId: orgId, isActive: true },
        }),
      ]);

      if (!persona) {
        result.errors.push('No active persona configured');
        return result;
      }

      if (integrations.length === 0) {
        result.errors.push('No connected social accounts');
        return result;
      }

      // ORIENT: Determine which platforms need content today
      // For MVP, simply check each connected platform
      const platformsToPost = integrations
        .map((i) => i.providerIdentifier)
        .filter((p): p is string => !!p);

      // DECIDE: For each platform, generate content based on goals
      // For MVP, use the first active goal's description as the topic
      const topic = goals.length > 0
        ? goals[0].description
        : 'Share something valuable about our expertise';

      // ACT: Generate content for each platform
      for (const platform of platformsToPost) {
        try {
          // Create an agent session for tracking
          const session = await this.prisma.agentSession.create({
            data: {
              organizationId: orgId,
              personaId: persona.id,
              trigger: 'SCHEDULED',
              status: 'RUNNING',
              metadata: { platform, topic } as any,
            },
          });

          // Record the action in audit log
          await this.prisma.auditLog.create({
            data: {
              organizationId: orgId,
              agentSessionId: session.id,
              personaId: persona.id,
              action: 'OODA_CYCLE_START',
              platform,
              metadata: { topic, goalCount: goals.length } as any,
              riskScore: 0,
            },
          });

          result.postsGenerated++;
          result.platforms.push(platform);

          // Update session status
          await this.prisma.agentSession.update({
            where: { id: session.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
        } catch (error: any) {
          result.errors.push(`${platform}: ${error.message}`);
          this.logger.error(`Failed to generate for ${platform}: ${error.message}`);
        }
      }

      this.logger.log(
        `OODA cycle complete for org ${orgId}: ${result.postsGenerated} posts, ${result.errors.length} errors`,
      );
    } catch (error: any) {
      result.errors.push(`Cycle failed: ${error.message}`);
      this.logger.error(`OODA cycle failed for org ${orgId}: ${error.message}`);
    }

    return result;
  }

  /**
   * Get all organizations that have autonomous posting enabled.
   */
  @ActivityMethod()
  async getActiveOrganizations(): Promise<string[]> {
    // For MVP: return all orgs that have at least one active persona and one integration
    const orgs = await this.prisma.organization.findMany({
      where: {
        users: { some: {} }, // has at least one user
      },
      select: { id: true },
    });

    // Filter to orgs with active personas
    const orgIds: string[] = [];
    for (const org of orgs) {
      const hasPersona = await this.prisma.persona.findFirst({
        where: { organizationId: org.id, isActive: true },
      });
      if (hasPersona) {
        orgIds.push(org.id);
      }
    }

    return orgIds;
  }
}
