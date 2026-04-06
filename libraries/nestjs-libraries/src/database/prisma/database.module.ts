import { Global, Module } from '@nestjs/common';
import { PrismaRepository, PrismaService, PrismaTransaction } from './prisma.service';
import { OrganizationRepository } from '@mav/nestjs-libraries/database/prisma/organizations/organization.repository';
import { OrganizationService } from '@mav/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@mav/nestjs-libraries/database/prisma/users/users.service';
import { UsersRepository } from '@mav/nestjs-libraries/database/prisma/users/users.repository';
import { SubscriptionService } from '@mav/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { SubscriptionRepository } from '@mav/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { NotificationService } from '@mav/nestjs-libraries/database/prisma/notifications/notification.service';
import { IntegrationService } from '@mav/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationRepository } from '@mav/nestjs-libraries/database/prisma/integrations/integration.repository';
import { PostsService } from '@mav/nestjs-libraries/database/prisma/posts/posts.service';
import { PostsRepository } from '@mav/nestjs-libraries/database/prisma/posts/posts.repository';
import { IntegrationManager } from '@mav/nestjs-libraries/integrations/integration.manager';
import { MediaService } from '@mav/nestjs-libraries/database/prisma/media/media.service';
import { MediaRepository } from '@mav/nestjs-libraries/database/prisma/media/media.repository';
import { NotificationsRepository } from '@mav/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@mav/nestjs-libraries/services/email.service';
import { StripeService } from '@mav/nestjs-libraries/services/stripe.service';
import { ExtractContentService } from '@mav/nestjs-libraries/openai/extract.content.service';
import { OpenaiService } from '@mav/nestjs-libraries/openai/openai.service';
import { AgenciesService } from '@mav/nestjs-libraries/database/prisma/agencies/agencies.service';
import { AgenciesRepository } from '@mav/nestjs-libraries/database/prisma/agencies/agencies.repository';
import { TrackService } from '@mav/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@mav/nestjs-libraries/short-linking/short.link.service';
import { WebhooksRepository } from '@mav/nestjs-libraries/database/prisma/webhooks/webhooks.repository';
import { WebhooksService } from '@mav/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { SignatureRepository } from '@mav/nestjs-libraries/database/prisma/signatures/signature.repository';
import { SignatureService } from '@mav/nestjs-libraries/database/prisma/signatures/signature.service';
import { AutopostRepository } from '@mav/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { AutopostService } from '@mav/nestjs-libraries/database/prisma/autopost/autopost.service';
import { SetsService } from '@mav/nestjs-libraries/database/prisma/sets/sets.service';
import { SetsRepository } from '@mav/nestjs-libraries/database/prisma/sets/sets.repository';
import { ThirdPartyRepository } from '@mav/nestjs-libraries/database/prisma/third-party/third-party.repository';
import { ThirdPartyService } from '@mav/nestjs-libraries/database/prisma/third-party/third-party.service';
import { VideoManager } from '@mav/nestjs-libraries/videos/video.manager';
import { FalService } from '@mav/nestjs-libraries/openai/fal.service';
import { RefreshIntegrationService } from '@mav/nestjs-libraries/integrations/refresh.integration.service';
import { OAuthRepository } from '@mav/nestjs-libraries/database/prisma/oauth/oauth.repository';
import { OAuthService } from '@mav/nestjs-libraries/database/prisma/oauth/oauth.service';

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
