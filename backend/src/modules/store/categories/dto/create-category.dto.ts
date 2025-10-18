import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsArray,
} from 'class-validator';

/**
 * DTO for creating Category.
 */
export class CreateCategoryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(75)
  description?: string;

  /**
   * Optional parent category id (uuid). If provided the service will assign
   * the new category as a child of the given parent.
   */
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsArray()
  productIds?: string[];
}
