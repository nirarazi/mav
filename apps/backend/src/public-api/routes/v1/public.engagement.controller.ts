import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@mav/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PrismaService } from '@mav/nestjs-libraries/database/prisma/prisma.service';
import { EngagementService } from '@mav/engagement-engine/engagement.service';
import { GraduationService } from '@mav/engagement-engine/graduation.service';

@ApiTags('Engagements')
@Controller('/public/v1/engagements')
export class PublicEngagementController {
  private readonly logger = new Logger(PublicEngagementController.name);

  constructor(
    private readonly engagementService: EngagementService,
    private readonly graduationService: GraduationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('/')
  async list(
    @GetOrgFromRequest() org: Organization,
    @Query('platform') platform?: string,
    @Query('tier') tier?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.engagementService.findByOrg(org.id, {
      platform,
      tier: tier ? parseInt(tier, 10) : undefined,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('/missed')
  async getMissed(@GetOrgFromRequest() org: Organization) {
    return this.engagementService.findMissed(org.id);
  }

  @Post('/:id/teach')
  async teach(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { idealResponse: string },
  ) {
    const engagement = await this.engagementService.findById(id, org.id);
    if (!engagement) {
      return { error: 'Engagement not found' };
    }

    // Update the active persona's engagementExamples with this teaching
    const persona = await this.prisma.persona.findFirst({
      where: { organizationId: org.id, isActive: true },
    });

    if (persona) {
      const tier = engagement.tier;
      const tierLabel = { 1: 'passive', 2: 'acknowledgment', 3: 'conversational', 4: 'proactive', 5: 'sensitive' }[tier] ?? 'conversational';
      const existing = (persona.engagementExamples as any) ?? {};
      const tierExamples = existing[tierLabel] ?? [];
      tierExamples.push({
        incoming: engagement.incomingText,
        response: body.idealResponse,
      });
      existing[tierLabel] = tierExamples;

      await this.prisma.persona.update({
        where: { id: persona.id },
        data: { engagementExamples: existing },
      });
    }

    return { success: true };
  }

  @Get('/autonomy')
  async getAutonomy(@GetOrgFromRequest() org: Organization) {
    return this.graduationService.getAutonomyStatus(org.id);
  }

  @Put('/autonomy')
  async overrideAutonomy(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { platform: string; tier: number; status: 'SUPERVISED' | 'AUTONOMOUS' },
  ) {
    return this.graduationService.overrideStatus(
      org.id,
      body.platform,
      body.tier,
      body.status,
    );
  }

  @Post('/poll')
  async triggerPoll(@GetOrgFromRequest() org: Organization) {
    // Placeholder — will be implemented when Temporal workflow is wired
    return {
      message: 'Poll triggered',
      orgId: org.id,
    };
  }
}
