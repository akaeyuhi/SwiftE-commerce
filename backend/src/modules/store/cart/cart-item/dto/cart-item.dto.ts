import { IsUUID, IsInt, Min } from 'class-validator';

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

  @IsInt()
  @Min(1)
  quantity: number = 1;
}
