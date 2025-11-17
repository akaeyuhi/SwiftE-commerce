import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import { PaginatedResponse } from '@/lib/api/types';
import {
  CreateNewsDto,
  NewsPost,
  UpdateNewsDto,
} from '@/features/news/types/news.types.ts';
import { NewsFilters } from '@/shared/types/filters.types.ts';

export class NewsService extends BaseService {
  /**
   * Get all news articles for a store
   */
  async getNews(
    storeId: string,
    filters?: NewsFilters
  ): Promise<PaginatedResponse<NewsPost>> {
    const url = buildUrl(API_ENDPOINTS.NEWS.LIST_ALL, { storeId });
    const urlWithParams = this.buildQueryUrl(url, filters as any);
    const response = await this.client.get<any>(urlWithParams);
    return this.handlePaginatedResponse<NewsPost>(response);
  }

  /**
   * Get all store news (admin view)
   */
  async getAllStoreNews(storeId: string): Promise<PaginatedResponse<NewsPost>> {
    const url = buildUrl(API_ENDPOINTS.NEWS.LIST_ALL, { storeId });
    return this.client.get<PaginatedResponse<NewsPost>>(url);
  }

  /*
   * Get single news article
   */
  async getNewsPost(storeId: string, articleId: string): Promise<NewsPost> {
    const url = buildUrl(API_ENDPOINTS.NEWS.FIND_ONE, {
      storeId,
      id: articleId,
    });
    return this.client.get<NewsPost>(url);
  }

  /**
   * Create news article
   */
  async createNews(storeId: string, data: CreateNewsDto): Promise<NewsPost> {
    const url = buildUrl(API_ENDPOINTS.NEWS.CREATE, { storeId });
    return this.client.post<NewsPost>(url, data);
  }

  /**
   * Create news with relations
   */
  async createNewsWithRelations(
    storeId: string,
    data: CreateNewsDto
  ): Promise<NewsPost> {
    const url = buildUrl(API_ENDPOINTS.NEWS.CREATE_WITH_RELATIONS, { storeId });
    const formData = this.mapToFormData(data);
    return this.client.post<NewsPost>(url, formData);
  }

  /**
   * Update news article
   */
  async updateNews(
    storeId: string,
    articleId: string,
    data: UpdateNewsDto
  ): Promise<NewsPost> {
    const url = buildUrl(API_ENDPOINTS.NEWS.UPDATE, { storeId, id: articleId });
    const formData = this.mapToFormData(data);
    return this.client.put<NewsPost>(url, formData);
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
  async publishNews(storeId: string, articleId: string): Promise<NewsPost> {
    const url = buildUrl(API_ENDPOINTS.NEWS.PUBLISH, {
      storeId,
      id: articleId,
    });
    return this.client.post<NewsPost>(url);
  }

  /**
   * Unpublish news article
   */
  async unpublishNews(storeId: string, articleId: string): Promise<NewsPost> {
    const url = buildUrl(API_ENDPOINTS.NEWS.UNPUBLISH, {
      storeId,
      id: articleId,
    });
    return this.client.post<NewsPost>(url);
  }
}

export const newsService = new NewsService();
