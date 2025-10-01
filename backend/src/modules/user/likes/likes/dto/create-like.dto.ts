import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreateLikeDto {
  @IsUUID()
  userId: string;

  @IsIn(['store', 'product'])
  likedEntity: 'store' | 'product';

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;
}
