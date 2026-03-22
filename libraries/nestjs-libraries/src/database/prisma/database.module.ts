import { Global, Module } from '@nestjs/common';
import { PrismaRepository, PrismaService, PrismaTransaction } from './prisma.service';
import { OrganizationRepository } from '@maverick/nestjs-libraries/database/prisma/organizations/organization.repository';
import { OrganizationService } from '@maverick/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@maverick/nestjs-libraries/database/prisma/users/users.service';
import { UsersRepository } from '@maverick/nestjs-libraries/database/prisma/users/users.repository';
import { SubscriptionService } from '@maverick/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { SubscriptionRepository } from '@maverick/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { NotificationService } from '@maverick/nestjs-libraries/database/prisma/notifications/notification.service';
import { IntegrationService } from '@maverick/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationRepository } from '@maverick/nestjs-libraries/database/prisma/integrations/integration.repository';
import { PostsService } from '@maverick/nestjs-libraries/database/prisma/posts/posts.service';
import { PostsRepository } from '@maverick/nestjs-libraries/database/prisma/posts/posts.repository';
import { IntegrationManager } from '@maverick/nestjs-libraries/integrations/integration.manager';
import { MediaService } from '@maverick/nestjs-libraries/database/prisma/media/media.service';
import { MediaRepository } from '@maverick/nestjs-libraries/database/prisma/media/media.repository';
import { NotificationsRepository } from '@maverick/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@maverick/nestjs-libraries/services/email.service';
import { StripeService } from '@maverick/nestjs-libraries/services/stripe.service';
import { ExtractContentService } from '@maverick/nestjs-libraries/openai/extract.content.service';
import { OpenaiService } from '@maverick/nestjs-libraries/openai/openai.service';
import { AgenciesService } from '@maverick/nestjs-libraries/database/prisma/agencies/agencies.service';
import { AgenciesRepository } from '@maverick/nestjs-libraries/database/prisma/agencies/agencies.repository';
import { TrackService } from '@maverick/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@maverick/nestjs-libraries/short-linking/short.link.service';
import { WebhooksRepository } from '@maverick/nestjs-libraries/database/prisma/webhooks/webhooks.repository';
import { WebhooksService } from '@maverick/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { SignatureRepository } from '@maverick/nestjs-libraries/database/prisma/signatures/signature.repository';
import { SignatureService } from '@maverick/nestjs-libraries/database/prisma/signatures/signature.service';
import { AutopostRepository } from '@maverick/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { AutopostService } from '@maverick/nestjs-libraries/database/prisma/autopost/autopost.service';
import { SetsService } from '@maverick/nestjs-libraries/database/prisma/sets/sets.service';
import { SetsRepository } from '@maverick/nestjs-libraries/database/prisma/sets/sets.repository';
import { ThirdPartyRepository } from '@maverick/nestjs-libraries/database/prisma/third-party/third-party.repository';
import { ThirdPartyService } from '@maverick/nestjs-libraries/database/prisma/third-party/third-party.service';
import { VideoManager } from '@maverick/nestjs-libraries/videos/video.manager';
import { FalService } from '@maverick/nestjs-libraries/openai/fal.service';
import { RefreshIntegrationService } from '@maverick/nestjs-libraries/integrations/refresh.integration.service';
import { OAuthRepository } from '@maverick/nestjs-libraries/database/prisma/oauth/oauth.repository';
import { OAuthService } from '@maverick/nestjs-libraries/database/prisma/oauth/oauth.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    PrismaService,
    PrismaRepository,
    PrismaTransaction,
    UsersService,
    UsersRepository,
    OrganizationService,
    OrganizationRepository,
    SubscriptionService,
    SubscriptionRepository,
    NotificationService,
    NotificationsRepository,
    WebhooksRepository,
    WebhooksService,
    IntegrationService,
    IntegrationRepository,
    PostsService,
    PostsRepository,
    StripeService,
    SignatureRepository,
    AutopostRepository,
    AutopostService,
    SignatureService,
    MediaService,
    MediaRepository,
    AgenciesService,
    AgenciesRepository,
    IntegrationManager,
    RefreshIntegrationService,
    ExtractContentService,
    OpenaiService,
    FalService,
    EmailService,
    TrackService,
    ShortLinkService,
    SetsService,
    SetsRepository,
    ThirdPartyRepository,
    ThirdPartyService,
    OAuthRepository,
    OAuthService,
    VideoManager,
  ],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule {}
