import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { PaginatedResponse } from '@/lib/api/types';
import { Store } from '@/features/stores/types/stores.types.ts';
import { api } from '@/lib/api';

export function useStores(
  filters?: any,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Store>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.stores.list(filters),
    queryFn: () => api.stores.getStores(filters),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useStore(
  storeId: string,
  options?: Omit<UseQueryOptions<Store>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.detail(storeId),
    queryFn: () => api.stores.getStore(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// export function useStoreStats(
//   storeId: string,
//   options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
// ) {
//   return useQuery({
//     queryKey: [...queryKeys.stores.detail(storeId), 'stats'],
//     queryFn: () => api.stores.stats(storeId),
//     enabled: !!storeId,
//     staleTime: 2 * 60 * 1000,
//     ...options,
//   });
// }
