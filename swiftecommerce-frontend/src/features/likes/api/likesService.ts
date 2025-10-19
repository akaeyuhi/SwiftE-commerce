import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import { Like, UserLikes } from '../types/likes.types';

export class LikesService extends BaseService {
  /**
   * Get all likes for a user
   */
  async getUserLikes(userId: string): Promise<UserLikes> {
    const url = buildUrl(API_ENDPOINTS.LIKES.LIST, { userId });
    return this.client.get<UserLikes>(url);
  }

  /**
   * Like a product
   */
  async likeProduct(userId: string, productId: string): Promise<Like> {
    const url = buildUrl(API_ENDPOINTS.LIKES.ADD_PRODUCT_LIKE, {
      userId,
      productId,
    });
    return this.client.post<Like>(url);
  }

  /**
   * Like a store
   */
  async likeStore(userId: string, storeId: string): Promise<Like> {
    const url = buildUrl(API_ENDPOINTS.LIKES.ADD_STORE_LIKE, {
      userId,
      storeId,
    });
    return this.client.post<Like>(url);
  }

  /**
   * Unlike (remove like)
   */
  async unlike(userId: string, likeId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.LIKES.REMOVE, { userId, id: likeId });
    return this.client.delete<void>(url);
  }

  /**
   * Check if user liked a product
   */
  async hasLikedProduct(userId: string, productId: string): Promise<boolean> {
    const likes = await this.getUserLikes(userId);
    return likes.products.some((p) => p.product.id === productId);
  }

  /**
   * Check if user liked a store
   */
  async hasLikedStore(userId: string, storeId: string): Promise<boolean> {
    const likes = await this.getUserLikes(userId);
    return likes.stores.some((s) => s.store.id === storeId);
  }
}

export const likesService = new LikesService();
