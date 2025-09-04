import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
  @IsUUID() storeId: string;
  @IsString() categoryId?: string;
}
