import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@mav/nestjs-libraries/database/prisma/database.module';
import { ApiModule } from '@mav/backend/api/api.module';
import { APP_GUARD } from '@nestjs/core';
import { PoliciesGuard } from '@mav/backend/services/auth/permissions/permissions.guard';
import { PublicApiModule } from '@mav/backend/public-api/public.api.module';
import { ThrottlerBehindProxyGuard } from '@mav/nestjs-libraries/throttler/throttler.provider';
import { ThrottlerModule } from '@nestjs/throttler';
import { AgentModule } from '@mav/nestjs-libraries/agent/agent.module';
import { ThirdPartyModule } from '@mav/nestjs-libraries/3rdparties/thirdparty.module';
import { VideoModule } from '@mav/nestjs-libraries/videos/video.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { FILTER } from '@mav/nestjs-libraries/sentry/sentry.exception';
import { ChatModule } from '@mav/nestjs-libraries/chat/chat.module';
import { getTemporalModule } from '@mav/nestjs-libraries/temporal/temporal.module';
import { TemporalRegisterMissingSearchAttributesModule } from '@mav/nestjs-libraries/temporal/temporal.register';
import { InfiniteWorkflowRegisterModule } from '@mav/nestjs-libraries/temporal/infinite.workflow.register';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ioRedis } from '@mav/nestjs-libraries/redis/redis.service';

// Mav modules
import { PersonaModule } from '@mav/persona-engine/persona.module';
import { ComplianceModule } from '@mav/compliance-engine/compliance.module';
import { ApprovalModule } from '@mav/approval-engine/approval.module';
import { LlmModule } from '@mav/llm-adapter/llm.module';
import { EngagementModule } from '@mav/engagement-engine';

@Global()
@Module({
  imports: [
    SentryModule.forRoot(),
    DatabaseModule,
    ApiModule,
    PublicApiModule,
    AgentModule,
    ThirdPartyModule,
    VideoModule,
    ChatModule,
    getTemporalModule(false),
    TemporalRegisterMissingSearchAttributesModule,
    InfiniteWorkflowRegisterModule,
    // Mav autonomous modules
    PersonaModule,
    ComplianceModule,
    ApprovalModule,
    LlmModule,
    EngagementModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 3600000,
          limit: process.env.API_LIMIT ? Number(process.env.API_LIMIT) : 30,
        },
      ],
      storage: new ThrottlerStorageRedisService(ioRedis),
    }),
  ],
  controllers: [],
  providers: [
    FILTER,
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
  ],
  exports: [
    DatabaseModule,
    ApiModule,
    PublicApiModule,
    AgentModule,
    ThrottlerModule,
    ChatModule,
    PersonaModule,
    ComplianceModule,
    ApprovalModule,
    LlmModule,
  ],
})
export class AppModule {}
