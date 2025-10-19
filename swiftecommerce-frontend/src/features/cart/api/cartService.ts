import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS } from '@/config/api.config';
import { Cart } from '../types/cart.types';

export interface AddToCartData {
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemData {
  quantity: number;
}

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
    cartId: string,
    data: AddToCartData
  ): Promise<Cart> {
    const url = this.buildUrl(API_ENDPOINTS.CART.ADD_ITEM, {
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
    data: UpdateCartItemData
  ): Promise<Cart> {
    const url = this.buildUrl(API_ENDPOINTS.CART.UPDATE_ITEM, {
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
    const url = this.buildUrl(API_ENDPOINTS.CART.REMOVE_ITEM, {
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
}

export const cartService = new CartService();
