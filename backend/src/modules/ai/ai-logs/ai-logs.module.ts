import { Module } from '@nestjs/common';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiLogsController } from 'src/modules/ai/ai-logs/ai-logs.controller';
import { AiLogRepository } from 'src/modules/ai/ai-logs/ai-log.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import {PolicyModule} from "src/modules/auth/policy/policy.module";

@Module({
  imports: [TypeOrmModule.forFeature([AiLog]), PolicyModule],
  controllers: [AiLogsController],
  providers: [AiLogsService, AiLogRepository],
  exports: [AiLogsService, AiLogRepository],
})
export class AiLogsModule {}
