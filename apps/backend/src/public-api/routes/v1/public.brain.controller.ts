import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@maverick/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PrismaService } from '@maverick/nestjs-libraries/database/prisma/prisma.service';

@ApiTags('Brain')
@Controller('/public/v1/brain')
export class PublicBrainController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trigger a manual OODA cycle for this organization.
   * In production, this would signal the Temporal workflow.
   * For MVP, it returns the org's readiness status.
   */
  @Post('/trigger')
  async triggerCycle(@GetOrgFromRequest() org: Organization) {
    // Check readiness
    const [persona, integrations, goals] = await Promise.all([
      this.prisma.persona.findFirst({
        where: { organizationId: org.id, isActive: true },
      }),
      this.prisma.integration.findMany({
        where: { organizationId: org.id, disabled: false },
        select: { id: true, providerIdentifier: true, name: true },
      }),
      this.prisma.goal.findMany({
        where: { organizationId: org.id, isActive: true },
        select: { id: true, description: true },
      }),
    ]);

    const ready = !!persona && integrations.length > 0;
    const issues: string[] = [];

    if (!persona) issues.push('No active persona configured');
    if (integrations.length === 0) issues.push('No connected social accounts');
    if (goals.length === 0) issues.push('No active goals set (will use default topic)');

    if (!ready) {
      return {
        triggered: false,
        ready: false,
        issues,
      };
    }

    // Create an agent session to track this trigger
    const session = await this.prisma.agentSession.create({
      data: {
        organizationId: org.id,
        personaId: persona!.id,
        trigger: 'MANUAL',
        status: 'RUNNING',
        reasoning: {
          platforms: integrations.map((i) => i.providerIdentifier),
          goalCount: goals.length,
        } as any,
      },
    });

    return {
      triggered: true,
      ready: true,
      sessionId: session.id,
      persona: { id: persona!.id, name: persona!.name },
      platforms: integrations.map((i) => ({
        id: i.id,
        platform: i.providerIdentifier,
        name: i.name,
      })),
      goals: goals.map((g) => ({ id: g.id, description: g.description })),
    };
  }

  /**
   * Get the brain's current status for this organization.
   */
  @Get('/status')
  async getStatus(@GetOrgFromRequest() org: Organization) {
    const [persona, integrations, goals, recentSessions, pendingApprovals] =
      await Promise.all([
        this.prisma.persona.findFirst({
          where: { organizationId: org.id, isActive: true },
          select: { id: true, name: true, role: true },
        }),
        this.prisma.integration.count({
          where: { organizationId: org.id, disabled: false },
        }),
        this.prisma.goal.count({
          where: { organizationId: org.id, isActive: true },
        }),
        this.prisma.agentSession.findMany({
          where: { organizationId: org.id },
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            trigger: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
        }),
        this.prisma.approvalItem.count({
          where: { organizationId: org.id, status: 'PENDING' },
        }),
      ]);

    return {
      ready: !!persona && integrations > 0,
      activePersona: persona,
      connectedPlatforms: integrations,
      activeGoals: goals,
      pendingApprovals,
      recentSessions,
    };
  }
}
