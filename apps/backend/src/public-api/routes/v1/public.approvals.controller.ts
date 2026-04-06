import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@mav/nestjs-libraries/user/org.from.request';
import { Organization, ApprovalType } from '@prisma/client';
import { ApprovalService } from '@mav/approval-engine/approval.service';
import { PolicyService } from '@mav/approval-engine/policy.service';
import { PostsService } from '@mav/nestjs-libraries/database/prisma/posts/posts.service';
import { PrismaService } from '@mav/nestjs-libraries/database/prisma/prisma.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

@ApiTags('Approvals')
@Controller('/public/v1/approvals')
export class PublicApprovalsController {
  private readonly logger = new Logger(PublicApprovalsController.name);

  constructor(
    private readonly approvalService: ApprovalService,
    private readonly policyService: PolicyService,
    private readonly postsService: PostsService,
    private readonly prisma: PrismaService,
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
    const approval = await this.approvalService.decide(
      id,
      body.approved,
      `api:${org.id}`,
      body.feedback,
    );

    let postResult: any = null;

    // When approved, try to create a Mav draft post scheduled for 1 hour from now
    if (body.approved) {
      const payload = approval.payload as Record<string, any> | null;
      if (payload?.platform && payload?.content) {
        try {
          // Find an active integration for this platform
          const integration = await this.prisma.integration.findFirst({
            where: {
              organizationId: org.id,
              providerIdentifier: payload.platform,
              disabled: false,
            },
          });

          if (integration) {
            const scheduledDate = dayjs.utc().add(1, 'hour').toDate();
            const rawBody = {
              type: 'schedule',
              date: scheduledDate.toISOString(),
              posts: [
                {
                  content: [{ content: payload.content }],
                  integration: { id: integration.id },
                  settings: {},
                },
              ],
            };

            const mappedBody = await this.postsService.mapTypeToPost(
              rawBody as any,
              org.id,
              false,
            );
            mappedBody.type = 'schedule';
            postResult = await this.postsService.createPost(org.id, mappedBody);

            this.logger.log(
              `Created scheduled post for approval ${id} on ${payload.platform} (integration ${integration.id})`,
            );
          } else {
            this.logger.log(
              `No active integration found for platform "${payload.platform}" — skipping post creation for approval ${id}`,
            );
          }
        } catch (err: any) {
          this.logger.error(
            `Failed to create post for approved item ${id}: ${err.message}`,
          );
          // Don't fail the approval — just log the error
          postResult = { error: err.message };
        }
      }
    }

    return {
      approval,
      ...(postResult !== null ? { post: postResult } : {}),
    };
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
