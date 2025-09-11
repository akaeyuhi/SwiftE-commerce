import { IsString, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO for creating Category.
 */
export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Optional parent category id (uuid). If provided the service will assign
   * the new category as a child of the given parent.
   */
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
