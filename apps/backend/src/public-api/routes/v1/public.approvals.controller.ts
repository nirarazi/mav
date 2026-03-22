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
import { Organization, ApprovalType } from '@prisma/client';
import { ApprovalService } from '@maverick/approval-engine/approval.service';
import { PolicyService } from '@maverick/approval-engine/policy.service';


@ApiTags('Approvals')
@Controller('/public/v1/approvals')
export class PublicApprovalsController {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly policyService: PolicyService,
  ) {}

  @Get('/pending')
  async getPending(
    @GetOrgFromRequest() org: Organization,
    @Query('type') type?: ApprovalType,
  ) {
    return this.approvalService.getPending(org.id, type);
  }

  @Get('/history')
  async getHistory(
    @GetOrgFromRequest() org: Organization,
    @Query('type') type?: ApprovalType,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.approvalService.getHistory(org.id, {
      type,
      status: status as any,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post('/:id/decide')
  async decide(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { approved: boolean; feedback?: string },
  ) {
    // Use org.id as decidedBy for API-key authenticated requests
    return this.approvalService.decide(
      id,
      body.approved,
      `api:${org.id}`,
      body.feedback,
    );
  }

  @Post('/submit')
  async submit(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      type: ApprovalType;
      payload: Record<string, unknown>;
      riskScore: number;
      personaId?: string;
      agentSessionId?: string;
    },
  ) {
    return this.approvalService.submit(
      org.id,
      body.type,
      body.payload,
      body.riskScore,
      body.personaId,
      body.agentSessionId,
    );
  }

  @Post('/expire')
  async expireStale(@GetOrgFromRequest() org: Organization) {
    const count = await this.approvalService.expireStale();
    return { expired: count };
  }

  @Get('/policy')
  async getPolicy(
    @GetOrgFromRequest() org: Organization,
    @Query('platform') platform?: string,
    @Query('actionType') actionType?: ApprovalType,
  ) {
    const policy = await this.policyService.getPolicy(
      org.id,
      platform,
      actionType,
    );
    return { policy };
  }

  @Post('/policy')
  async setPolicy(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      platform: string | null;
      actionType: ApprovalType | null;
      policy: string;
      riskThreshold?: number;
    },
  ) {
    return this.policyService.setPolicy(
      org.id,
      body.platform,
      body.actionType,
      body.policy as any,
      body.riskThreshold,
    );
  }
}
