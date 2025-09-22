import { Module } from '@nestjs/common';
import { AiLogsService } from './ai-logs.service';
import { AiLogsController } from './ai-logs.controller';
import { AiLogRepository } from './ai-log.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiLog } from 'src/entities/store/ai-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiLog])],
  controllers: [AiLogsController],
  providers: [AiLogsService, AiLogRepository],
  exports: [AiLogsService],
})
export class AiLogsModule {}
