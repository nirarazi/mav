import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthService } from '@maverick/backend/services/auth/auth.service';
import { StripeService } from '@maverick/nestjs-libraries/services/stripe.service';
import { PoliciesGuard } from '@maverick/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@maverick/backend/services/auth/permissions/permissions.service';
import { IntegrationManager } from '@maverick/nestjs-libraries/integrations/integration.manager';
import { UploadModule } from '@maverick/nestjs-libraries/upload/upload.module';
import { OpenaiService } from '@maverick/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@maverick/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@maverick/nestjs-libraries/services/codes.service';
import { PublicIntegrationsController } from '@maverick/backend/public-api/routes/v1/public.integrations.controller';
import { PublicPersonasController } from '@maverick/backend/public-api/routes/v1/public.personas.controller';
import { PublicApprovalsController } from '@maverick/backend/public-api/routes/v1/public.approvals.controller';
import { PublicComplianceController } from '@maverick/backend/public-api/routes/v1/public.compliance.controller';
import { PublicBrainController } from '@maverick/backend/public-api/routes/v1/public.brain.controller';
import { PublicAuthMiddleware } from '@maverick/backend/services/auth/public.auth.middleware';

const authenticatedController = [
  PublicIntegrationsController,
  PublicPersonasController,
  PublicApprovalsController,
  PublicComplianceController,
  PublicBrainController,
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

