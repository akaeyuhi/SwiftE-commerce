import { Module } from '@nestjs/common';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiLogsController } from 'src/modules/ai/ai-logs/ai-logs.controller';
import { AiLogsRepository } from 'src/modules/ai/ai-logs/ai-logs.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import { PolicyModule } from 'src/modules/auth/policy/policy.module';

@Module({
  imports: [TypeOrmModule.forFeature([AiLog]), PolicyModule],
  controllers: [AiLogsController],
  providers: [AiLogsService, AiLogsRepository],
  exports: [AiLogsService, AiLogsRepository],
})
export class AiLogsModule {}
