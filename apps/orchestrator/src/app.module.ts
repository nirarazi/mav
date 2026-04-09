import { Module } from '@nestjs/common';
import { PostActivity } from '@mav/orchestrator/activities/post.activity';
import { getTemporalModule } from '@mav/nestjs-libraries/temporal/temporal.module';
import { DatabaseModule } from '@mav/nestjs-libraries/database/prisma/database.module';
import { AutopostService } from '@mav/nestjs-libraries/database/prisma/autopost/autopost.service';
import { EmailActivity } from '@mav/orchestrator/activities/email.activity';
import { IntegrationsActivity } from '@mav/orchestrator/activities/integrations.activity';
import { BrainActivity } from '@mav/orchestrator/activities/brain.activity';
import { EngagementActivity } from '@mav/orchestrator/activities/engagement.activity';

const activities = [
  PostActivity,
  AutopostService,
  EmailActivity,
  IntegrationsActivity,
  BrainActivity,
  EngagementActivity,
];
@Module({
  imports: [
    DatabaseModule,
    getTemporalModule(true, require.resolve('./workflows'), activities),
  ],
  controllers: [],
  providers: [...activities],
  get exports() {
    return [...this.providers, ...this.imports];
  },
})
export class AppModule {}
