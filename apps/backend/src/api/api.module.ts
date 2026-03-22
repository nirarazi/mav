import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from '@maverick/backend/api/routes/auth.controller';
import { AuthService } from '@maverick/backend/services/auth/auth.service';
import { UsersController } from '@maverick/backend/api/routes/users.controller';
import { AuthMiddleware } from '@maverick/backend/services/auth/auth.middleware';
import { StripeController } from '@maverick/backend/api/routes/stripe.controller';
import { StripeService } from '@maverick/nestjs-libraries/services/stripe.service';
import { AnalyticsController } from '@maverick/backend/api/routes/analytics.controller';
import { PoliciesGuard } from '@maverick/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@maverick/backend/services/auth/permissions/permissions.service';
import { IntegrationsController } from '@maverick/backend/api/routes/integrations.controller';
import { IntegrationManager } from '@maverick/nestjs-libraries/integrations/integration.manager';
import { SettingsController } from '@maverick/backend/api/routes/settings.controller';
import { PostsController } from '@maverick/backend/api/routes/posts.controller';
import { MediaController } from '@maverick/backend/api/routes/media.controller';
import { UploadModule } from '@maverick/nestjs-libraries/upload/upload.module';
import { BillingController } from '@maverick/backend/api/routes/billing.controller';
import { NotificationsController } from '@maverick/backend/api/routes/notifications.controller';
import { OpenaiService } from '@maverick/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@maverick/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@maverick/nestjs-libraries/services/codes.service';
import { CopilotController } from '@maverick/backend/api/routes/copilot.controller';
import { PublicController } from '@maverick/backend/api/routes/public.controller';
import { RootController } from '@maverick/backend/api/routes/root.controller';
import { TrackService } from '@maverick/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@maverick/nestjs-libraries/short-linking/short.link.service';
import { Nowpayments } from '@maverick/nestjs-libraries/crypto/nowpayments';
import { WebhookController } from '@maverick/backend/api/routes/webhooks.controller';
import { SignatureController } from '@maverick/backend/api/routes/signature.controller';
import { AutopostController } from '@maverick/backend/api/routes/autopost.controller';
import { SetsController } from '@maverick/backend/api/routes/sets.controller';
import { ThirdPartyController } from '@maverick/backend/api/routes/third-party.controller';
import { MonitorController } from '@maverick/backend/api/routes/monitor.controller';
import { NoAuthIntegrationsController } from '@maverick/backend/api/routes/no.auth.integrations.controller';
import { EnterpriseController } from '@maverick/backend/api/routes/enterprise.controller';
import { OAuthAppController } from '@maverick/backend/api/routes/oauth-app.controller';
import { ApprovedAppsController } from '@maverick/backend/api/routes/approved-apps.controller';
import { OAuthController, OAuthAuthorizedController } from '@maverick/backend/api/routes/oauth.controller';
import { PersonasController } from '@maverick/backend/api/routes/personas.controller';
import { ApprovalsController } from '@maverick/backend/api/routes/approvals.controller';
import { AuthProviderManager } from '@maverick/backend/services/auth/providers/providers.manager';
import { GithubProvider } from '@maverick/backend/services/auth/providers/github.provider';
import { GoogleProvider } from '@maverick/backend/services/auth/providers/google.provider';
import { FarcasterProvider } from '@maverick/backend/services/auth/providers/farcaster.provider';
import { WalletProvider } from '@maverick/backend/services/auth/providers/wallet.provider';
import { OauthProvider } from '@maverick/backend/services/auth/providers/oauth.provider';

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
