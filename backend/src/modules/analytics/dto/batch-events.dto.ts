import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordEventDto } from './record-event.dto';

export class BatchEventsDto {
  @IsArray()
  @ArrayMaxSize(1000) // Prevent oversized batches
  @ValidateNested({ each: true })
  @Type(() => RecordEventDto)
  events: RecordEventDto[];
}
