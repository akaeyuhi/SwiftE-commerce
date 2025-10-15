import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
  IsArray,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiGenerateOptions } from 'src/common/interfaces/ai/generator.interface';

export class GenerateNamesDto {
  @IsString()
  @MinLength(3)
  storeStyle: string;

  @IsString()
  @MinLength(3)
  seed: string;

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

export class ProductSpecDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  material?: string;
}

export class GenerateDescriptionDto {
  @IsString()
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSpecDto)
  productSpec?: ProductSpecDto;

  @IsOptional()
  @IsString()
  tone?: string = 'professional and engaging';

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsObject()
  options?: AiGenerateOptions;
}

export class GenerateIdeasDto {
  @IsString()
  @MinLength(3)
  storeStyle: string;

  @IsString()
  @MinLength(3)
  seed: string;

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
