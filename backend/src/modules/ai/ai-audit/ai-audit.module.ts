import { Module } from '@nestjs/common';
import { AiAuditRepository } from 'src/modules/ai/ai-audit/ai-audit.repository';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';

@Module({
  imports: [],
  providers: [AiAuditRepository, AiAuditService],
  exports: [AiAuditService],
})
export class AiAuditsModule {}
