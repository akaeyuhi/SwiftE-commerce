import { Controller, UseGuards } from '@nestjs/common';
import { AiLogsService } from './ai-logs.service';
import { CreateAiLogDto } from './dto/create-ai-log.dto';
import { UpdateAiLogDto } from './dto/update-ai-log.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { AiLog } from 'src/entities/ai-log.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';

@Controller('stores/:storeId/ai-logs')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class AiLogsController extends BaseController<
  AiLog,
  CreateAiLogDto,
  UpdateAiLogDto
> {
  constructor(private readonly aiLogsService: AiLogsService) {
    super(aiLogsService);
  }
}
