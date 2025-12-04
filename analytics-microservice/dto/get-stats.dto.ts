import { IsOptional, IsDateString, IsIn } from 'class-validator';

export class GetStatsDto {
  @IsOptional()
  @IsDateString()
  from?: string; // ISO date e.g. 2025-09-01

  @IsOptional()
  @IsDateString()
  to?: string;

  // granularity: daily | weekly | monthly
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  granularity?: 'daily' | 'weekly' | 'monthly';
}
