import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import { PaginatedResponse } from '@/lib/api/types';
import {
  Review,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewFilters,
} from '../types/reviews.types';

export class ReviewsService extends BaseService {
  /**
   * Get all reviews for a product
   */
  async getReviews(
    storeId: string,
    productId: string,
    filters?: ReviewFilters
  ): Promise<PaginatedResponse<Review>> {
    const url = buildUrl(API_ENDPOINTS.REVIEWS.LIST, { storeId, productId });
    const urlWithParams = this.buildQueryUrl(url, filters as any);
    const response = await this.client.get<any>(urlWithParams);
    return this.handlePaginatedResponse<Review>(response);
  }

  /**
   * Get single review
   */
  async getReview(
    storeId: string,
    productId: string,
    reviewId: string
  ): Promise<Review> {
    const url = buildUrl(API_ENDPOINTS.REVIEWS.FIND_ONE, {
      storeId,
      productId,
      id: reviewId,
    });
    return this.client.get<Review>(url);
  }

  /**
   * Create review
   */
  async createReview(
    storeId: string,
    productId: string,
    data: CreateReviewRequest
  ): Promise<Review> {
    const url = buildUrl(API_ENDPOINTS.REVIEWS.CREATE, { storeId, productId });
    return this.client.post<Review>(url, data);
  }

  /**
   * Create review with relations (user, product)
   */
  async createReviewWithRelations(
    storeId: string,
    productId: string,
    userId: string,
    data: CreateReviewRequest
  ): Promise<Review> {
    const url = buildUrl(API_ENDPOINTS.REVIEWS.CREATE_WITH_RELATIONS, {
      storeId,
      productId,
    });
    return this.client.post<Review>(url, { ...data, userId });
  }

  /**
   * Update review
   */
  async updateReview(
    storeId: string,
    productId: string,
    reviewId: string,
    data: UpdateReviewRequest
  ): Promise<Review> {
    const url = buildUrl(API_ENDPOINTS.REVIEWS.UPDATE, {
      storeId,
      productId,
      id: reviewId,
    });
    return this.client.patch<Review>(url, data);
  }

  /**
   * Delete review
   */
  async deleteReview(
    storeId: string,
    productId: string,
    reviewId: string
  ): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.REVIEWS.DELETE, {
      storeId,
      productId,
      id: reviewId,
    });
    return this.client.delete<void>(url);
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(
    storeId: string,
    productId: string,
    reviewId: string
  ): Promise<Review> {
    const url = buildUrl(API_ENDPOINTS.REVIEWS.FIND_ONE, {
      storeId,
      productId,
      id: reviewId,
    });
    return this.client.post<Review>(`${url}/helpful`);
  }
}

export const reviewsService = new ReviewsService();
