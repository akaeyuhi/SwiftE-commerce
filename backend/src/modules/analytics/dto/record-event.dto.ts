import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsObject,
} from 'class-validator';
import { AnalyticsEventType } from 'src/modules/analytics/entities/analytics-event.entity';

export class RecordEventDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEnum(AnalyticsEventType)
  eventType: AnalyticsEventType;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}
