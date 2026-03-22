import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@maverick/nestjs-libraries/database/prisma/database.module';
import { ApiModule } from '@maverick/backend/api/api.module';
import { APP_GUARD } from '@nestjs/core';
import { PoliciesGuard } from '@maverick/backend/services/auth/permissions/permissions.guard';
import { PublicApiModule } from '@maverick/backend/public-api/public.api.module';
import { ThrottlerBehindProxyGuard } from '@maverick/nestjs-libraries/throttler/throttler.provider';
import { ThrottlerModule } from '@nestjs/throttler';
import { AgentModule } from '@maverick/nestjs-libraries/agent/agent.module';
import { ThirdPartyModule } from '@maverick/nestjs-libraries/3rdparties/thirdparty.module';
import { VideoModule } from '@maverick/nestjs-libraries/videos/video.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { FILTER } from '@maverick/nestjs-libraries/sentry/sentry.exception';
import { ChatModule } from '@maverick/nestjs-libraries/chat/chat.module';
import { getTemporalModule } from '@maverick/nestjs-libraries/temporal/temporal.module';
import { TemporalRegisterMissingSearchAttributesModule } from '@maverick/nestjs-libraries/temporal/temporal.register';
import { InfiniteWorkflowRegisterModule } from '@maverick/nestjs-libraries/temporal/infinite.workflow.register';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ioRedis } from '@maverick/nestjs-libraries/redis/redis.service';

// Maverick modules
import { PersonaModule } from '@maverick/persona-engine/persona.module';
import { ComplianceModule } from '@maverick/compliance-engine/compliance.module';
import { ApprovalModule } from '@maverick/approval-engine/approval.module';
import { LlmModule } from '@maverick/llm-adapter/llm.module';

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
    // Maverick autonomous modules
    PersonaModule,
    ComplianceModule,
    ApprovalModule,
    LlmModule,
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
