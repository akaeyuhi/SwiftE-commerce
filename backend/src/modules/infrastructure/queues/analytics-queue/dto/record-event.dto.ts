import { IsOptional, IsEnum, IsUUID, IsNumber, IsIn } from 'class-validator';
import { AnalyticsEventType } from 'src/modules/analytics/entities/analytics-event.entity';

export type Maybe<T> = T | undefined;

export class RecordEventDto {
  @IsOptional()
  @IsUUID()
  storeId?: Maybe<string>;

  @IsOptional()
  @IsUUID()
  productId?: Maybe<string>;

  @IsOptional()
  @IsUUID()
  userId?: Maybe<string>;

  @IsEnum(AnalyticsEventType)
  eventType: AnalyticsEventType;

  @IsIn(['store', 'product'])
  invokedOn: 'store' | 'product';

  @IsOptional()
  @IsIn(['before', 'after'])
  when?: 'before' | 'after';

  @IsOptional()
  @IsNumber()
  value?: Maybe<number>;

  @IsOptional()
  meta?: Maybe<Record<string, any>>;
}
