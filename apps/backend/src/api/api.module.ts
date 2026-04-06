import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from '@mav/backend/api/routes/auth.controller';
import { AuthService } from '@mav/backend/services/auth/auth.service';
import { UsersController } from '@mav/backend/api/routes/users.controller';
import { AuthMiddleware } from '@mav/backend/services/auth/auth.middleware';
import { StripeController } from '@mav/backend/api/routes/stripe.controller';
import { StripeService } from '@mav/nestjs-libraries/services/stripe.service';
import { AnalyticsController } from '@mav/backend/api/routes/analytics.controller';
import { PoliciesGuard } from '@mav/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@mav/backend/services/auth/permissions/permissions.service';
import { IntegrationsController } from '@mav/backend/api/routes/integrations.controller';
import { IntegrationManager } from '@mav/nestjs-libraries/integrations/integration.manager';
import { SettingsController } from '@mav/backend/api/routes/settings.controller';
import { PostsController } from '@mav/backend/api/routes/posts.controller';
import { MediaController } from '@mav/backend/api/routes/media.controller';
import { UploadModule } from '@mav/nestjs-libraries/upload/upload.module';
import { BillingController } from '@mav/backend/api/routes/billing.controller';
import { NotificationsController } from '@mav/backend/api/routes/notifications.controller';
import { OpenaiService } from '@mav/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@mav/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@mav/nestjs-libraries/services/codes.service';
import { CopilotController } from '@mav/backend/api/routes/copilot.controller';
import { PublicController } from '@mav/backend/api/routes/public.controller';
import { RootController } from '@mav/backend/api/routes/root.controller';
import { TrackService } from '@mav/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@mav/nestjs-libraries/short-linking/short.link.service';
import { Nowpayments } from '@mav/nestjs-libraries/crypto/nowpayments';
import { WebhookController } from '@mav/backend/api/routes/webhooks.controller';
import { SignatureController } from '@mav/backend/api/routes/signature.controller';
import { AutopostController } from '@mav/backend/api/routes/autopost.controller';
import { SetsController } from '@mav/backend/api/routes/sets.controller';
import { ThirdPartyController } from '@mav/backend/api/routes/third-party.controller';
import { MonitorController } from '@mav/backend/api/routes/monitor.controller';
import { NoAuthIntegrationsController } from '@mav/backend/api/routes/no.auth.integrations.controller';
import { EnterpriseController } from '@mav/backend/api/routes/enterprise.controller';
import { OAuthAppController } from '@mav/backend/api/routes/oauth-app.controller';
import { ApprovedAppsController } from '@mav/backend/api/routes/approved-apps.controller';
import { OAuthController, OAuthAuthorizedController } from '@mav/backend/api/routes/oauth.controller';
import { PersonasController } from '@mav/backend/api/routes/personas.controller';
import { ApprovalsController } from '@mav/backend/api/routes/approvals.controller';
import { AuthProviderManager } from '@mav/backend/services/auth/providers/providers.manager';
import { GithubProvider } from '@mav/backend/services/auth/providers/github.provider';
import { GoogleProvider } from '@mav/backend/services/auth/providers/google.provider';
import { FarcasterProvider } from '@mav/backend/services/auth/providers/farcaster.provider';
import { WalletProvider } from '@mav/backend/services/auth/providers/wallet.provider';
import { OauthProvider } from '@mav/backend/services/auth/providers/oauth.provider';

const authenticatedController = [
  UsersController,
  AnalyticsController,
  IntegrationsController,
  SettingsController,
  PostsController,
  MediaController,
  BillingController,
  NotificationsController,
  CopilotController,
  WebhookController,
  SignatureController,
  AutopostController,
  SetsController,
  ThirdPartyController,
  OAuthAppController,
  ApprovedAppsController,
  OAuthAuthorizedController,
  PersonasController,
  ApprovalsController,
];
@Module({
  imports: [UploadModule],
  controllers: [
    RootController,
    StripeController,
    AuthController,
    PublicController,
    MonitorController,
    EnterpriseController,
    NoAuthIntegrationsController,
    OAuthController,
    ...authenticatedController,
  ],
  providers: [
    AuthService,
    StripeService,
    OpenaiService,
    ExtractContentService,
    AuthMiddleware,
    PoliciesGuard,
    PermissionsService,
    CodesService,
    IntegrationManager,
    TrackService,
    ShortLinkService,
    Nowpayments,
    AuthProviderManager,
    GithubProvider,
    GoogleProvider,
    FarcasterProvider,
    WalletProvider,
    OauthProvider,
  ],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class ApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(...authenticatedController);
  }
}
