import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { CreateCartDto } from 'src/modules/store/cart/dto/create-cart.dto';
import { UpdateCartDto } from 'src/modules/store/cart/dto/update-cart.dto';
import { CartRepository } from 'src/modules/store/cart/cart.repository';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';

/**
 * CartService
 *
 * High-level shopping cart operations. Delegates cart-item management to CartItemService
 * to keep responsibilities separated.
 */
@Injectable()
export class CartService extends BaseService<
  ShoppingCart,
  CreateCartDto,
  UpdateCartDto
> {
  constructor(
    private readonly cartRepo: CartRepository,
    private readonly cartItemService: CartItemService
  ) {
    super(cartRepo);
  }

  /**
   * Get existing cart for a user+store, or create a new one when missing.
   *
   * @param userId - uuid of the user
   * @param storeId - uuid of the store
   * @returns existing or newly created ShoppingCart
   */
  async getOrCreateCart(
    userId: string,
    storeId: string
  ): Promise<ShoppingCart> {
    const existing = await this.cartRepo.findByUserAndStore(userId, storeId);
    if (existing) return existing;

    return await this.cartRepo.createEntity({
      user: { id: userId },
      store: { id: storeId },
      items: [],
    });
  }

  /**
   * Retrieve a user's cart for a specific store.
   *
   * @param userId - uuid of the user
   * @param storeId - uuid of the store
   * @returns ShoppingCart or null when not found
   */
  async getCartByUserAndStore(
    userId: string,
    storeId: string
  ): Promise<ShoppingCart | null> {
    return this.cartRepo.findByUserAndStore(userId, storeId);
  }

  /**
   * @deprecated
   * Add (or increment) an item in user's cart for a specific store.
   *
   * Behavior:
   *  - Ensures a cart exists for (userId, storeId)
   *  - Delegates to CartItemService.addOrIncrement for item-level logic
   *
   * @param userId - uuid of the user
   * @param storeId - uuid of the store
   * @param variantId - uuid of product variant to add
   * @param quantity - positive integer (default 1)
   * @returns created or updated CartItem
   */
  async addItemToUserCart(
    userId: string,
    storeId: string,
    variantId: string,
    quantity = 1
  ): Promise<CartItem> {
    if (quantity <= 0) throw new BadRequestException('Quantity must be > 0');

    const cart = await this.getOrCreateCart(userId, storeId);
    return this.cartItemService.addOrIncrement({
      cartId: cart.id,
      variantId,
      quantity,
    });
  }

  /**
   * Update quantity of a cart item.
   *
   * Delegates to CartItemService.updateQuantity.
   *
   * @param itemId - uuid of the cart item
   * @param quantity - new quantity (>= 0). If 0 the item is removed.
   * @returns updated CartItem (or removed representation with quantity=0)
   */
  async updateItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<CartItem> {
    return this.cartItemService.updateQuantity(itemId, quantity);
  }

  /**
   * Remove a cart item by id.
   *
   * Delegates to CartItemService.remove.
   *
   * @param itemId - uuid of the cart item
   */
  async removeItem(itemId: string): Promise<void> {
    return this.cartItemService.remove(itemId);
  }

  /**
   * Clear all items from a cart.
   *
   * Implementation: fetches items via CartItemService.findByCart and removes each item.
   * This keeps logic inside CartItemService consistent (and allows additional
   * hooks/side-effects there).
   *
   * @param cartId - uuid of the shopping cart to clear
   */
  async clearCart(cartId: string): Promise<void> {
    const items = await this.cartItemService.findByCart(cartId);
    await Promise.all(items.map((it) => this.cartItemService.remove(it.id)));
  }

  /**
   * Return all carts for a given user across all stores (each cart includes store relation).
   *
   * Useful for showing a user their carts across stores and merging items client-side.
   *
   * @param userId - uuid of the user
   * @returns array of ShoppingCart (with store and items relations loaded by repository)
   */
  async getUserMergedCarts(userId: string): Promise<ShoppingCart[]> {
    return this.cartRepo.findAllByUser(userId);
  }
}
