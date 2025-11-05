import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  StoreDto,
  StoreSearchResultDto,
  StoreStatsDto,
} from '@/features/stores/types/store.types.ts';
import { api } from '@/lib/api';
import { StoreHealthDto } from '@/features/stores/api/storesService.ts';
import { StoreFilters } from '@/shared/types/filters.types.ts';

export function useStores(
  filters?: StoreFilters,
  options?: Omit<UseQueryOptions<StoreDto[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.list(filters),
    queryFn: () => api.stores.findAll(filters),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useStore(
  storeId: string,
  options?: Omit<UseQueryOptions<StoreDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.detail(storeId),
    queryFn: () => api.stores.findOne(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useStoreStats(
  storeId: string,
  options?: Omit<UseQueryOptions<StoreStatsDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.stats(storeId),
    queryFn: () => api.stores.getStats(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useStoreQuickStats(
  storeId: string,
  options?: Omit<UseQueryOptions<StoreStatsDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.stores.stats(storeId), 'quick'],
    queryFn: () => api.stores.getQuickStats(storeId),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useStoreSearch(
  query: string,
  filters?: StoreFilters,
  options?: Omit<
    UseQueryOptions<StoreSearchResultDto[]>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: [...queryKeys.stores.all, 'search', query, filters],
    queryFn: () => api.stores.search(query, filters),
    enabled: query.length > 0,
    staleTime: 1 * 60 * 1000,
    ...options,
  });
}

export function useStoreAutocomplete(
  query: string,
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.stores.all, 'autocomplete', query],
    queryFn: () => api.stores.autocomplete(query),
    enabled: query.length > 0,
    staleTime: 1 * 60 * 1000,
    ...options,
  });
}

export function useTopStoresByRevenue(
  params?: { limit?: number; period?: string },
  options?: Omit<UseQueryOptions<StoreStatsDto[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.stores.all, 'top-revenue', params],
    queryFn: () => api.stores.getTopByRevenue(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useTopStoresByProducts(
  params?: { limit?: number },
  options?: Omit<UseQueryOptions<StoreStatsDto[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.stores.all, 'top-products', params],
    queryFn: () => api.stores.getTopByProducts(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useTopStoresByFollowers(
  params?: { limit?: number },
  options?: Omit<UseQueryOptions<StoreStatsDto[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.stores.all, 'top-followers', params],
    queryFn: () => api.stores.getTopByFollowers(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useStoreHealth(
  storeId: string,
  options?: Omit<UseQueryOptions<StoreHealthDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.health(storeId),
    queryFn: () => api.stores.getHealth(storeId),
    enabled: !!storeId,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Fetch top products by sales
 */
export function useTopProducts(
  storeId: string,
  limit: number = 4,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.products.topBySales(storeId, limit),
    queryFn: async () =>
      await api.products.getTopBySales(storeId, {
        limit,
      }),
    enabled: !!storeId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}
