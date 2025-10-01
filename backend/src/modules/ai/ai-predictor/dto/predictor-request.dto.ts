import {
  IsOptional,
  IsString,
  IsObject,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BuildFeatureVectorDto {
  @IsOptional()
  @IsString()
  storeId?: string;
}

export class SinglePredictDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsObject()
  features?: Record<string, number>;

  @IsOptional()
  @IsString()
  modelVersion?: string;
}

export class BatchPredictDto {
  @IsArray()
  @ArrayMaxSize(1000)
  items: Array<string | { productId: string; storeId?: string } | any>;

  @IsOptional()
  @IsBoolean()
  persist?: boolean;

  @IsOptional()
  @IsString()
  modelVersion?: string;
}

export class TrendingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  timeframe?: 'day' | 'week' | 'month';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;
}

export class PredictionQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  modelVersion?: string;
}
