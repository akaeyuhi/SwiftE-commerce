import { PartialType } from '@nestjs/mapped-types';
import { CreateAiLogDto } from './create-ai-log.dto';

export class UpdateAiLogDto extends PartialType(CreateAiLogDto) {}
