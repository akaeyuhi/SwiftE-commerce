import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CartItemDto } from 'src/modules/store/cart/cart-item/dto/cart-item.dto';
import { Type } from 'class-transformer';

/**
 * DTO to create a ShoppingCart.
 */
export class CreateCartDto {
  @IsUUID()
  @IsOptional()
  userId: string;

  @IsUUID()
  @IsOptional()
  storeId: string;

  @IsArray()
  @ValidateNested()
  @Type(() => CartItemDto)
  products: CartItemDto[];
}
