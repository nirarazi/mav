import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@mav/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PrismaService } from '@mav/nestjs-libraries/database/prisma/prisma.service';
import { PersonaService } from '@mav/persona-engine/persona.service';
import { ComplianceService } from '@mav/compliance-engine/compliance.service';
import { ApprovalService } from '@mav/approval-engine/approval.service';
import { AuditService } from '@mav/compliance-engine/audit.service';
import { ContentPipeline } from '@mav/agent-brain/content.pipeline';
import { LlmService } from '@mav/llm-adapter/llm.service';

@ApiTags('Brain')
@Controller('/public/v1/brain')
export class PublicBrainController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly personaService: PersonaService,
    private readonly complianceService: ComplianceService,
    private readonly approvalService: ApprovalService,
    private readonly auditService: AuditService,
  ) {}

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

  /**
   * Generate a post using the content pipeline:
   * persona → LLM → compliance → approval queue
   */
  @Post('/generate')
  async generatePost(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { platform: string; topic: string; personaId?: string },
  ) {
    if (!body.platform || !body.topic) {
      throw new HttpException(
        { error: 'Both "platform" and "topic" are required.' },
        400,
      );
    }

    let llmService: LlmService;
    try {
      llmService = new LlmService();
    } catch (err: any) {
      throw new HttpException(
        {
          error: 'LLM not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.',
          details: err.message,
        },
        503,
      );
    }

    const pipeline = new ContentPipeline(
      this.personaService,
      llmService,
      this.complianceService,
      this.approvalService,
      this.auditService,
    );

    try {
      const result = await pipeline.generatePost({
        orgId: org.id,
        platform: body.platform,
        topic: body.topic,
        personaId: body.personaId,
      });

      return result;
    } catch (err: any) {
      throw new HttpException(
        {
          error: 'Content generation failed.',
          details: err.message,
        },
        422,
      );
    }
  }
}
