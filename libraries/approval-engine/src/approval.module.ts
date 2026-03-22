import { Global, Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { PolicyService } from './policy.service';

@Global()
@Module({
  providers: [ApprovalService, PolicyService],
  get exports() {
    return this.providers;
  },
})
export class ApprovalModule {}
