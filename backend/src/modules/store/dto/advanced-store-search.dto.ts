import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdvancedStoreSearchDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRevenue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxRevenue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minProducts?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxProducts?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minFollowers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxFollowers?: number;

  @IsOptional()
  @IsEnum(['name', 'revenue', 'followers', 'products', 'recent'])
  sortBy?: 'name' | 'revenue' | 'followers' | 'products' | 'recent';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}
