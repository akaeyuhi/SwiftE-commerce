import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { AiLog } from 'src/entities/ai-log.entity';
import { CreateAiLogDto } from 'src/modules/ai-logs/dto/create-ai-log.dto';
import { UpdateAiLogDto } from 'src/modules/ai-logs/dto/update-ai-log.dto';
import { AiLogRepository } from 'src/modules/ai-logs/ai-log.repository';

@Injectable()
export class AiLogsService extends BaseService<
  AiLog,
  CreateAiLogDto,
  UpdateAiLogDto
> {
  constructor(private readonly logRepo: AiLogRepository) {
    super(logRepo);
  }
}
