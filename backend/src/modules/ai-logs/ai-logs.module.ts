import { Module } from '@nestjs/common';
import { AiLogsService } from './ai-logs.service';
import { AiLogsController } from './ai-logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiLog } from 'src/entities/ai-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiLog])],
  controllers: [AiLogsController],
  providers: [AiLogsService],
})
export class AiLogsModule {}
