import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  Category, CreateCategoryDto, UpdateCategoryDto,
} from '../types/categories.types';

export class CategoriesService extends BaseService {
  /**
   * Get all categories for a store
   */
  async getCategories(storeId: string): Promise<Category[]> {
    const url = buildUrl(API_ENDPOINTS.CATEGORIES.LIST, { storeId });
    return this.client.get<Category[]>(url);
  }

  /**
   * Get category tree
   */
  async getCategoryTree(storeId: string): Promise<Category[]> {
    const url = buildUrl(API_ENDPOINTS.CATEGORIES.TREE, { storeId });
    return this.client.get<Category[]>(url);
  }

  /**
   * Get single category
   */
  async getCategory(storeId: string, categoryId: string): Promise<Category> {
    const url = buildUrl(API_ENDPOINTS.CATEGORIES.FIND_ONE, {
      storeId,
      id: categoryId,
    });
    return this.client.get<Category>(url);
  }

  /**
   * Create category
   */
  async createCategory(
    storeId: string,
    data: CreateCategoryDto
  ): Promise<Category> {
    const url = buildUrl(API_ENDPOINTS.CATEGORIES.CREATE, { storeId });
    return this.client.post<Category>(url, data);
  }

  /**
   * Update category
   */
  async updateCategory(
    storeId: string,
    categoryId: string,
    data: UpdateCategoryDto
  ): Promise<Category> {
    const url = buildUrl(API_ENDPOINTS.CATEGORIES.UPDATE, {
      storeId,
      id: categoryId,
    });
    return this.client.patch<Category>(url, data);
  }

  /**
   * Delete category
   */
  async deleteCategory(storeId: string, categoryId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.CATEGORIES.DELETE, {
      storeId,
      id: categoryId,
    });
    return this.client.delete<void>(url);
  }
}

export const categoriesService = new CategoriesService();
