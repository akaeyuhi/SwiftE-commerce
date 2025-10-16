import { IsUUID, IsInt, Min, IsOptional } from 'class-validator';

/**
 * DTO used to add an item to a cart.
 *
 * Typical flow: controller extracts user & store context, ensures cart exists,
 * then calls CartItemService.createWithCartAndVariant or CartService.addItemToUserCart.
 */
export class CartItemDto {
  @IsUUID()
  cartId: string;

  @IsUUID()
  variantId: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsInt()
  @Min(1)
  quantity: number = 1;
}

export class UpdateCartItemQuantityDto {
  @IsInt()
  @Min(1)
  quantity: number = 1;
}
