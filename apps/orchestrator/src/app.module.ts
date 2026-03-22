import { Module } from '@nestjs/common';
import { PostActivity } from '@maverick/orchestrator/activities/post.activity';
import { getTemporalModule } from '@maverick/nestjs-libraries/temporal/temporal.module';
import { DatabaseModule } from '@maverick/nestjs-libraries/database/prisma/database.module';
import { AutopostService } from '@maverick/nestjs-libraries/database/prisma/autopost/autopost.service';
import { EmailActivity } from '@maverick/orchestrator/activities/email.activity';
import { IntegrationsActivity } from '@maverick/orchestrator/activities/integrations.activity';

const activities = [
  PostActivity,
  AutopostService,
  EmailActivity,
  IntegrationsActivity,
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
