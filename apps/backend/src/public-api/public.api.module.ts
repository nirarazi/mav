import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthService } from '@mav/backend/services/auth/auth.service';
import { StripeService } from '@mav/nestjs-libraries/services/stripe.service';
import { PoliciesGuard } from '@mav/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@mav/backend/services/auth/permissions/permissions.service';
import { IntegrationManager } from '@mav/nestjs-libraries/integrations/integration.manager';
import { UploadModule } from '@mav/nestjs-libraries/upload/upload.module';
import { OpenaiService } from '@mav/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@mav/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@mav/nestjs-libraries/services/codes.service';
import { PublicIntegrationsController } from '@mav/backend/public-api/routes/v1/public.integrations.controller';
import { PublicPersonasController } from '@mav/backend/public-api/routes/v1/public.personas.controller';
import { PublicApprovalsController } from '@mav/backend/public-api/routes/v1/public.approvals.controller';
import { PublicComplianceController } from '@mav/backend/public-api/routes/v1/public.compliance.controller';
import { PublicBrainController } from '@mav/backend/public-api/routes/v1/public.brain.controller';
import { PublicEngagementController } from '@mav/backend/public-api/routes/v1/public.engagement.controller';
import { PublicAuthMiddleware } from '@mav/backend/services/auth/public.auth.middleware';

const authenticatedController = [
  PublicIntegrationsController,
  PublicPersonasController,
  PublicApprovalsController,
  PublicComplianceController,
  PublicBrainController,
  PublicEngagementController,
];
@Module({
  imports: [UploadModule],
  controllers: [...authenticatedController],
  providers: [
    AuthService,
    StripeService,
    OpenaiService,
    ExtractContentService,
    PoliciesGuard,
    PermissionsService,
    CodesService,
    IntegrationManager,
  ],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class PublicApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PublicAuthMiddleware).forRoutes(...authenticatedController);
  }
}

