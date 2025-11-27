import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS } from '@/config/api.config';
import {
  CartItem,
  CartItemDto,
  CreateCartDto,
  ShoppingCart as Cart,
  UpdateCartItemQuantityDto,
} from '@/features/cart/types/cart.types.ts';
import { PaginatedResponse } from '@/shared/types/common.types.ts';

export class CartService extends BaseService {
  /**
   * Get or create a cart for a specific user and store.
   */
  async getOrCreateCart(storeId: string, userId: string): Promise<Cart> {
    const url = this.buildUrl(API_ENDPOINTS.CART.GET_OR_CREATE, {
      storeId,
      userId,
    });
    return this.client.post<Cart>(url);
  }

  /**
   * Get all carts for a user, merged across stores.
   */
  async getUserMergedCarts(userId: string): Promise<PaginatedResponse<Cart>> {
    const url = this.buildUrl(API_ENDPOINTS.CART.MERGED_CARTS, {
      userId,
    });
    return this.client.get<PaginatedResponse<Cart>>(url);
  }

  /**
   * Add an item to a user's cart for a specific store.
   */
  async addItem(
    storeId: string,
    userId: string,
    data: CartItemDto
  ): Promise<CartItem> {
    const url = this.buildUrl(API_ENDPOINTS.CART.ADD_OR_INCREMENT, {
      storeId,
      userId,
    });
    console.log(url);
    return this.client.post<CartItem>(url, data);
  }

  /**
   * Synchronize the backend cart with a list of items from the client.
   */
  async syncCart(
    storeId: string,
    userId: string,
    data: CreateCartDto
  ): Promise<Cart> {
    const url = this.buildUrl(API_ENDPOINTS.CART.SYNC_ITEMS, {
      storeId,
      userId,
    });
    return this.client.patch<Cart>(url, data);
  }

  /**
   * Update the quantity of a specific item in a cart.
   */
  async updateQuantity(
    storeId: string,
    userId: string,
    cartId: string,
    itemId: string,
    data: UpdateCartItemQuantityDto
  ): Promise<CartItem> {
    const url = this.buildUrl(API_ENDPOINTS.CART_ITEMS.UPDATE_QUANTITY, {
      storeId,
      userId,
      cartId,
      itemId,
    });
    return this.client.put<CartItem>(url, data);
  }

  /**
   * Remove a specific item from a cart.
   */
  async removeItem(
    storeId: string,
    userId: string,
    cartId: string,
    itemId: string
  ): Promise<void> {
    const url = this.buildUrl(API_ENDPOINTS.CART_ITEMS.DELETE, {
      storeId,
      userId,
      cartId,
      id: itemId,
    });
    return this.client.delete<void>(url);
  }

  /**
   * Clear all items from a user's cart in a specific store.
   */
  async clearCart(
    storeId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    const url = this.buildUrl(API_ENDPOINTS.CART.CLEAR, { storeId, userId });
    return this.client.delete<{ success: boolean }>(url);
  }
}

export const cartService = new CartService();
