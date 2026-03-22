import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { PostsService } from '@maverick/nestjs-libraries/database/prisma/posts/posts.service';
import {
  NotificationService,
  NotificationType,
} from '@maverick/nestjs-libraries/database/prisma/notifications/notification.service';
import { Integration, Post, State } from '@prisma/client';
import { stripHtmlValidation } from '@maverick/helpers/utils/strip.html.validation';
import { IntegrationManager } from '@maverick/nestjs-libraries/integrations/integration.manager';
import { AuthTokenDetails } from '@maverick/nestjs-libraries/integrations/social/social.integrations.interface';
import { RefreshIntegrationService } from '@maverick/nestjs-libraries/integrations/refresh.integration.service';
import { timer } from '@maverick/helpers/utils/timer';
import { IntegrationService } from '@maverick/nestjs-libraries/database/prisma/integrations/integration.service';
import { WebhooksService } from '@maverick/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { AutopostService } from '@maverick/nestjs-libraries/database/prisma/autopost/autopost.service';

@Injectable()
@Activity()
export class AutopostActivity {
  constructor(private _autoPostService: AutopostService) {}

  @ActivityMethod()
  async autoPost(id: string) {
    return this._autoPostService.startAutopost(id)
  }
}
