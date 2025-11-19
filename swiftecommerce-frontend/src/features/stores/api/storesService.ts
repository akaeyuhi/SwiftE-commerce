import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS } from '@/config/api.config';
import { StoreFilters } from '@/shared/types/filters.types';
import {
  CreateStoreDto,
  StoreDto,
  StoreOverviewDto,
  StoreSearchResultDto,
  StoreStatsDto,
  UpdateStoreDto,
} from '../types/store.types';
import { Order } from '@/features/orders/types/order.types.ts';
import { StoreHealthData } from '@/features/stores/types/store-health.types.ts';
import {PaginatedResponse} from "@/lib/api";

export interface StoreHealthDto {
  isHealthy: boolean;
  issues: string[];
  metrics: Record<string, any>;
}

export class StoreService extends BaseService {
  async findAll(filters?: StoreFilters): Promise<StoreDto[]> {
    const url = this.buildQueryUrl(API_ENDPOINTS.STORES.LIST, filters as any);
    return this.client.get<StoreDto[]>(url);
  }

  async create(data: CreateStoreDto): Promise<StoreDto> {
    const url = API_ENDPOINTS.STORES.CREATE;
    const { formData, headers } = this.mapToFormData(data);
    return this.client.post<StoreDto>(url, formData, { headers });
  }

  async findOne(id: string): Promise<StoreDto> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.FIND_ONE, { id });
    return this.client.get<StoreDto>(url);
  }

  async findStoreWithRoles(id: string): Promise<StoreDto> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.FIND_ONE_WITH_TEAM, { id });
    return this.client.get<StoreDto>(url);
  }

  async update(id: string, data: UpdateStoreDto): Promise<StoreDto> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.UPDATE, { id });
    const { formData, headers } = this.mapToFormData(data);
    return this.client.patch<StoreDto>(url, formData, { headers });
  }

  async delete(id: string): Promise<void> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.DELETE, { id });
    return this.client.delete<void>(url);
  }

  async softDelete(id: string): Promise<StoreDto> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.SOFT_DELETE, { id });
    return this.client.delete<StoreDto>(url);
  }

  async search(
    query: string,
    filters?: StoreFilters
  ): Promise<StoreSearchResultDto[]> {
    const url = this.buildQueryUrl(API_ENDPOINTS.STORES.SEARCH, {
      q: query,
      ...filters,
    } as any);
    return this.client.get<StoreSearchResultDto[]>(url);
  }

  async advancedSearch(
    searchParams: Record<string, any>
  ): Promise<PaginatedResponse<StoreDto>> {
    const url = API_ENDPOINTS.STORES.ADVANCED_SEARCH;
    const queryUrl = this.buildQueryUrl(url, searchParams);
    return this.client.post<PaginatedResponse<StoreDto>>(queryUrl);
  }

  async autocomplete(query: string): Promise<string[]> {
    const url = this.buildQueryUrl(API_ENDPOINTS.STORES.AUTOCOMPLETE, {
      q: query,
    });
    return this.client.get<string[]>(url);
  }

  async getStats(id: string): Promise<StoreStatsDto> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.STATS, { id });
    return this.client.get<StoreStatsDto>(url);
  }

  async getQuickStats(id: string): Promise<StoreStatsDto> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.QUICK_STATS, { id });
    return this.client.get<StoreStatsDto>(url);
  }

  async getTopByRevenue(params?: {
    limit?: number;
    period?: string;
  }): Promise<StoreStatsDto[]> {
    const url = this.buildQueryUrl(API_ENDPOINTS.STORES.TOP_BY_REVENUE, params);
    return this.client.get<StoreStatsDto[]>(url);
  }

  async getTopByProducts(params?: {
    limit?: number;
  }): Promise<StoreStatsDto[]> {
    const url = this.buildQueryUrl(
      API_ENDPOINTS.STORES.TOP_BY_PRODUCTS,
      params
    );
    return this.client.get<StoreStatsDto[]>(url);
  }

  async getTopByFollowers(params?: {
    limit?: number;
  }): Promise<StoreStatsDto[]> {
    const url = this.buildQueryUrl(
      API_ENDPOINTS.STORES.TOP_BY_FOLLOWERS,
      params
    );
    return this.client.get<StoreStatsDto[]>(url);
  }

  async recalculateStats(id: string): Promise<StoreStatsDto> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.RECALCULATE_STATS, {
      id,
    });
    return this.client.post<StoreStatsDto>(url);
  }

  async recalculateAllStats(): Promise<{ updated: number }> {
    const url = API_ENDPOINTS.STORES.RECALCULATE_ALL_STATS;
    return this.client.post<{ updated: number }>(url);
  }

  async getHealth(id: string): Promise<StoreHealthData> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.HEALTH, { id });
    return this.client.get<StoreHealthData>(url);
  }

  async uploadStoreFiles(
    storeId: string,
    files: { logo?: File; banner?: File }
  ) {
    const { formData, headers } = this.mapToFormData(files);

    const url = this.buildUrl(API_ENDPOINTS.STORES.UPLOAD, { id: storeId });

    const { data } = await this.client.post(url, formData, {
      headers,
    });

    return data;
  }

  async getOverview(id: string): Promise<StoreOverviewDto> {
    const url = this.buildUrl(API_ENDPOINTS.STORES.OVERVIEW, { id });
    return this.client.get(url);
  }

  async getRecentOrders(id: string, limit = 5): Promise<Order[]> {
    const idUrl = this.buildUrl(API_ENDPOINTS.STORES.RECENT_ORDERS, { id });
    const url = this.buildQueryUrl(idUrl, { limit });
    return this.client.get(url);
  }
}

export const storeService = new StoreService();
