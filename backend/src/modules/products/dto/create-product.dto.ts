import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  storeId: string;

  /**
   * Optional category id (UUID) to assign product to a category.
   */
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
