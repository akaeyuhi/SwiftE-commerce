import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';

export class BatchEventsDto {
  @IsArray()
  @ArrayMaxSize(1000) // Prevent oversized batches
  @ValidateNested({ each: true })
  @Type(() => RecordEventDto)
  events: RecordEventDto[];
}
