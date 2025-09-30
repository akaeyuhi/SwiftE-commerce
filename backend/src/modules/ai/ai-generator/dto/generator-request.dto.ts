import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiGenerateOptions } from 'src/common/interfaces/ai/generator.interface';

export class GenerateNamesDto {
  @IsOptional()
  @IsString()
  storeStyle?: string;

  @IsOptional()
  @IsString()
  seed?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  count?: number;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsObject()
  options?: AiGenerateOptions;
}

export class GenerateDescriptionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  productSpec?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsObject()
  options?: AiGenerateOptions;
}

export class GenerateIdeasDto {
  @IsOptional()
  @IsString()
  storeStyle?: string;

  @IsOptional()
  @IsString()
  seed?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  count?: number;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsObject()
  options?: AiGenerateOptions;
}

export class GenerateCustomDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsObject()
  options?: AiGenerateOptions;
}

export class GenerationQueryDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
