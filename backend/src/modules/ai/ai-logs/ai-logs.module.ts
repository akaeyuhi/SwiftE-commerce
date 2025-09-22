import { Module } from '@nestjs/common';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiLogsController } from 'src/modules/ai/ai-logs/ai-logs.controller';
import { AiLogRepository } from 'src/modules/ai/ai-logs/ai-log.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiLog } from 'src/entities/ai/ai-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiLog])],
  controllers: [AiLogsController],
  providers: [AiLogsService, AiLogRepository],
  exports: [AiLogsService],
})
export class AiLogsModule {}
