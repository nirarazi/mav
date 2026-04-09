import { Global, Module } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { GraduationService } from './graduation.service';
import { EngagementPipeline } from './engagement.pipeline';

@Global()
@Module({
  providers: [EngagementService, GraduationService, EngagementPipeline],
  exports: [EngagementService, GraduationService, EngagementPipeline],
})
export class EngagementModule {}
