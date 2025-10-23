import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import { StoreFilters } from '@/shared/types/filters.types';
import {
  CreateStoreDto,
  StoreDto,
  StoreSearchResultDto,
  StoreStatsDto,
  UpdateStoreDto,
} from '../types/store.types';

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
    return this.client.post<StoreDto>(url, data);
  }

  async findOne(id: string): Promise<StoreDto> {
    const url = buildUrl(API_ENDPOINTS.STORES.FIND_ONE, { id });
    return this.client.get<StoreDto>(url);
  }

  async update(id: string, data: UpdateStoreDto): Promise<StoreDto> {
    const url = buildUrl(API_ENDPOINTS.STORES.UPDATE, { id });
    return this.client.patch<StoreDto>(url, data);
  }

  async delete(id: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.STORES.DELETE, { id });
    return this.client.delete<void>(url);
  }

  async softDelete(id: string): Promise<StoreDto> {
    const url = buildUrl(API_ENDPOINTS.STORES.SOFT_DELETE, { id });
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
  ): Promise<StoreSearchResultDto[]> {
    const url = API_ENDPOINTS.STORES.ADVANCED_SEARCH;
    return this.client.post<StoreSearchResultDto[]>(url, searchParams);
  }

  async autocomplete(query: string): Promise<string[]> {
    const url = this.buildQueryUrl(API_ENDPOINTS.STORES.AUTOCOMPLETE, {
      q: query,
    });
    return this.client.get<string[]>(url);
  }

  async getStats(id: string): Promise<StoreStatsDto> {
    const url = buildUrl(API_ENDPOINTS.STORES.STATS, { id });
    return this.client.get<StoreStatsDto>(url);
  }

  async getQuickStats(id: string): Promise<StoreStatsDto> {
    const url = buildUrl(API_ENDPOINTS.STORES.QUICK_STATS, { id });
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
    const url = buildUrl(API_ENDPOINTS.STORES.RECALCULATE_STATS, { id });
    return this.client.post<StoreStatsDto>(url);
  }

  async recalculateAllStats(): Promise<{ updated: number }> {
    const url = API_ENDPOINTS.STORES.RECALCULATE_ALL_STATS;
    return this.client.post<{ updated: number }>(url);
  }

  async getHealth(id: string): Promise<StoreHealthDto> {
    const url = buildUrl(API_ENDPOINTS.STORES.HEALTH, { id });
    return this.client.get<StoreHealthDto>(url);
  }
}

export const storeService = new StoreService();
