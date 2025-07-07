import { Module } from '@nestjs/common';
import { AiLogsService } from './ai-logs.service';
import { AiLogsController } from './ai-logs.controller';

@Module({
  controllers: [AiLogsController],
  providers: [AiLogsService],
})
export class AiLogsModule {}
