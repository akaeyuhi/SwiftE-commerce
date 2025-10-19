import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import { PaginatedResponse } from '@/lib/api/types';
import {
  NewsArticle,
  CreateNewsRequest,
  UpdateNewsRequest,
  NewsFilters,
} from '../types/news.types';

export class NewsService extends BaseService {
  /**
   * Get all news articles for a store
   */
  async getNews(
    storeId: string,
    filters?: NewsFilters
  ): Promise<PaginatedResponse<NewsArticle>> {
    const url = buildUrl(API_ENDPOINTS.NEWS.LIST, { storeId });
    const urlWithParams = this.buildQueryUrl(url, filters as any);
    const response = await this.client.get<any>(urlWithParams);
    return this.handlePaginatedResponse<NewsArticle>(response);
  }

  /**
   * Get all store news (admin view)
   */
  async getAllStoreNews(storeId: string): Promise<NewsArticle[]> {
    const url = buildUrl(API_ENDPOINTS.NEWS.LIST_ALL, { storeId });
    return this.client.get<NewsArticle[]>(url);
  }

  /**
   * Get single news article
   */
  async getNewsArticle(
    storeId: string,
    articleId: string
  ): Promise<NewsArticle> {
    const url = buildUrl(API_ENDPOINTS.NEWS.FIND_ONE, {
      storeId,
      id: articleId,
    });
    return this.client.get<NewsArticle>(url);
  }

  /**
   * Create news article
   */
  async createNews(
    storeId: string,
    data: CreateNewsRequest
  ): Promise<NewsArticle> {
    const url = buildUrl(API_ENDPOINTS.NEWS.CREATE, { storeId });
    return this.client.post<NewsArticle>(url, data);
  }

  /**
   * Create news with relations
   */
  async createNewsWithRelations(
    storeId: string,
    data: CreateNewsRequest & { authorId: string }
  ): Promise<NewsArticle> {
    const url = buildUrl(API_ENDPOINTS.NEWS.CREATE_WITH_RELATIONS, { storeId });
    return this.client.post<NewsArticle>(url, data);
  }

  /**
   * Update news article
   */
  async updateNews(
    storeId: string,
    articleId: string,
    data: UpdateNewsRequest
  ): Promise<NewsArticle> {
    const url = buildUrl(API_ENDPOINTS.NEWS.UPDATE, { storeId, id: articleId });
    return this.client.patch<NewsArticle>(url, data);
  }

  /**
   * Delete news article
   */
  async deleteNews(storeId: string, articleId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.NEWS.DELETE, { storeId, id: articleId });
    return this.client.delete<void>(url);
  }

  /**
   * Publish news article
   */
  async publishNews(storeId: string, articleId: string): Promise<NewsArticle> {
    const url = buildUrl(API_ENDPOINTS.NEWS.PUBLISH, {
      storeId,
      id: articleId,
    });
    return this.client.post<NewsArticle>(url);
  }

  /**
   * Unpublish news article
   */
  async unpublishNews(
    storeId: string,
    articleId: string
  ): Promise<NewsArticle> {
    const url = buildUrl(API_ENDPOINTS.NEWS.UNPUBLISH, {
      storeId,
      id: articleId,
    });
    return this.client.post<NewsArticle>(url);
  }
}

export const newsService = new NewsService();
