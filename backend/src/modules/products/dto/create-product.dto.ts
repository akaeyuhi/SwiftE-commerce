import { IsString, IsOptional, IsUUID, IsArray } from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  @IsOptional()
  storeId: string;

  /**
   * Optional category id (UUID) to assign product to a category.
   */
  @IsOptional()
  @IsArray()
  categoryIds?: string[];

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
