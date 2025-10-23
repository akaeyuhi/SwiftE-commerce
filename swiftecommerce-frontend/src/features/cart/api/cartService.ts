import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS } from '@/config/api.config';
import {
  CartItem,
  CreateCartDto,
  ShoppingCart as Cart,
  UpdateCartItemQuantityDto,
} from '@/features/cart/types/cart.types.ts';

export class CartService extends BaseService {
  /**
   * Get or create cart
   */
  async getOrCreateCart(storeId: string, userId: string): Promise<Cart> {
    const url = this.buildUrl(API_ENDPOINTS.CART.GET_OR_CREATE, {
      storeId,
      userId,
    });
    return this.client.post<Cart>(url);
  }

  /**
   * Add item to cart
   */
  async addItem(
    storeId: string,
    userId: string,
    data: CreateCartDto
  ): Promise<Cart> {
    const url = this.buildUrl(API_ENDPOINTS.CART.ADD_OR_INCREMENT, {
      storeId,
      userId,
    });
    return this.client.post<Cart>(url, data);
  }

  /**
   * Add item to cart
   */
  async syncCart(
    storeId: string,
    userId: string,
    cartId: string,
    data: CreateCartDto
  ): Promise<Cart> {
    const url = this.buildUrl(API_ENDPOINTS.CART.SYNC_ITEMS, {
      storeId,
      userId,
      cartId,
    });
    return this.client.post<Cart>(url, data);
  }

  /**
   * Update cart item quantity
   */
  async updateItem(
    storeId: string,
    userId: string,
    cartId: string,
    itemId: string,
    data: UpdateCartItemQuantityDto
  ): Promise<Cart> {
    const url = this.buildUrl(API_ENDPOINTS.CART_ITEMS.UPDATE, {
      storeId,
      userId,
      cartId,
      itemId,
    });
    return this.client.patch<Cart>(url, data);
  }

  /**
   * Remove item from cart
   */
  async removeItem(
    storeId: string,
    userId: string,
    cartId: string,
    itemId: string
  ): Promise<Cart> {
    const url = this.buildUrl(API_ENDPOINTS.CART_ITEMS.DELETE, {
      storeId,
      userId,
      cartId,
      itemId,
    });
    return this.client.delete<Cart>(url);
  }

  /**
   * Clear cart
   */
  async clearCart(
    storeId: string,
    userId: string,
    cartId: string
  ): Promise<void> {
    return this.client.delete<void>(
      `/stores/${storeId}/${userId}/cart/${cartId}`
    );
  }

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
}

export const cartService = new CartService();
