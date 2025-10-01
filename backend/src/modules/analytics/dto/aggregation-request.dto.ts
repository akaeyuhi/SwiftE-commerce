import { IsString, IsOptional, IsObject } from 'class-validator';

export class AggregationRequestDto {
  @IsString()
  aggregatorName: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
