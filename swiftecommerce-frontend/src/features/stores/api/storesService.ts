import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS } from '@/config/api.config';
import { PaginatedResponse } from '@/lib/api/types';
import {
  CreateStoreData,
  Store,
} from '@/features/stores/types/stores.types.ts';

export class StoresService extends BaseService {
  /**
   * Get all stores
   */
  async getStores(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<PaginatedResponse<Store>> {
    const url = this.buildQueryUrl('/stores', params);
    const response = await this.client.get<any>(url);
    return this.handlePaginatedResponse<Store>(response);
  }

  /**
   * Get single store
   */
  async getStore(storeId: string): Promise<Store> {
    return this.client.get<Store>(`/stores/${storeId}`);
  }

  /**
   * Create new store
   */
  async createStore(userId: string, data: CreateStoreData): Promise<Store> {
    const url = this.buildUrl(API_ENDPOINTS.USERS.STORES, { id: userId });
    return this.client.post<Store>(url, data);
  }

  /**
   * Update store
   */
  async updateStore(storeId: string, data: Partial<Store>): Promise<Store> {
    return this.client.patch<Store>(`/stores/${storeId}`, data);
  }

  /**
   * Delete store
   */
  async deleteStore(storeId: string): Promise<void> {
    return this.client.delete<void>(`/stores/${storeId}`);
  }
}

export const storesService = new StoresService();
