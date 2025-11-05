import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';
import { StoreOverviewDto } from '@/features/stores/types/store.types.ts';

/**
 * Fetch comprehensive store overview data
 * Includes stats, recent orders, and top products
 */
export function useStoreOverview(
  storeId: string,
  options?: Omit<UseQueryOptions<StoreOverviewDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.overview(storeId),
    queryFn: async () => await api.stores.getOverview(storeId),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch recent orders for a store
 */
export function useRecentOrders(
  storeId: string,
  limit: number = 3,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.recentOrders(storeId, limit),
    queryFn: async () => await api.stores.getRecentOrders(storeId, limit),
    enabled: !!storeId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
}
