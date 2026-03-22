import { Global, Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { AuditService } from './audit.service';

@Global()
@Module({
  providers: [ComplianceService, AuditService],
  get exports() {
    return this.providers;
  },
})
export class ComplianceModule {}
