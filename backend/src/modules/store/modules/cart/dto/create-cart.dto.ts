import { IsArray, IsUUID } from 'class-validator';
import { ProductVariant } from 'src/entities/variant.entity';

/**
 * DTO to create a ShoppingCart.
 */
export class CreateCartDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  storeId: string;

  @IsArray()
  products: ProductVariant[];
}
