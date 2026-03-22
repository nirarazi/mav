import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@maverick/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ComplianceService } from '@maverick/compliance-engine/compliance.service';
import { AuditService } from '@maverick/compliance-engine/audit.service';

@ApiTags('Compliance')
@Controller('/public/v1/compliance')
export class PublicComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly auditService: AuditService,
  ) {}

  @Get('/rules/:platform')
  async getRules(@Param('platform') platform: string) {
    return this.complianceService.getRulesForPlatform(platform);
  }

  @Post('/check')
  async checkContent(
    @Body()
    body: {
      text: string;
      platform: string;
      images?: { url: string; altText?: string }[];
      videoLengthSec?: number;
      hashtags?: string[];
      personaId?: string;
    },
  ) {
    return this.complianceService.checkContent(
      {
        text: body.text,
        images: body.images,
        videoLengthSec: body.videoLengthSec,
        hashtags: body.hashtags,
      },
      body.platform,
      body.personaId,
    );
  }

  @Get('/rate-limit/:platform')
  async checkRateLimit(
    @GetOrgFromRequest() org: Organization,
    @Param('platform') platform: string,
  ) {
    const allowed = await this.complianceService.checkRateLimit(
      org.id,
      platform,
    );
    return { allowed };
  }

  @Post('/bot-label')
  async addBotLabel(
    @Body() body: { content: string; platform: string },
  ) {
    const labeled = this.complianceService.addBotLabel(
      body.content,
      body.platform,
    );
    return { content: labeled };
  }

  @Get('/audit')
  async getAuditHistory(
    @GetOrgFromRequest() org: Organization,
    @Query('action') action?: string,
    @Query('platform') platform?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.auditService.getHistory(org.id, {
      action,
      platform,
      offset: skip ? parseInt(skip, 10) : undefined,
      limit: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('/audit/session/:sessionId')
  async getSessionLogs(@Param('sessionId') sessionId: string) {
    return this.auditService.getSessionLogs(sessionId);
  }
}
