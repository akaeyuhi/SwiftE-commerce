import { IsOptional, IsUUID } from 'class-validator';

export class CreateLikeDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;
}
