import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@mav/nestjs-libraries/user/org.from.request';
import { Organization, ApprovalType, User } from '@prisma/client';
import { ApprovalService } from '@mav/approval-engine/approval.service';
import { PolicyService } from '@mav/approval-engine/policy.service';
import { GetUserFromRequest } from '@mav/nestjs-libraries/user/user.from.request';

@ApiTags('Approvals')
@Controller('/approvals')
export class ApprovalsController {
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

  @Post('/:id/approve')
  async approve(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body('feedback') feedback?: string,
  ) {
    return this.approvalService.decide(id, true, user.id, feedback);
  }

  @Post('/:id/reject')
  async reject(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string,
    @Body('feedback') feedback?: string,
  ) {
    return this.approvalService.decide(id, false, user.id, feedback);
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
