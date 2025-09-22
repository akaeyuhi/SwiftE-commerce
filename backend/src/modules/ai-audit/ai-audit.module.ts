import { Module } from '@nestjs/common';
import { AiAuditRepository } from './ai-audit.repository';
import { AiAuditService } from './ai-audit.service';

@Module({
  imports: [],
  providers: [AiAuditRepository, AiAuditService],
  exports: [AiAuditService],
})
export class AiAuditsModule {}
