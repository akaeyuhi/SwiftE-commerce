import { PartialType } from '@nestjs/mapped-types';
import { CreateAiLogDto } from 'src/modules/ai/ai-logs/dto/create-ai-log.dto';

export class UpdateAiLogDto extends PartialType(CreateAiLogDto) {}
