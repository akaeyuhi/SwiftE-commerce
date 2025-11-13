import {
  useQuery,
  UseQueryOptions,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { api, PaginatedResponse } from '@/lib/api';
import { Order } from '@/features/orders/types/order.types.ts';
import { useAuth } from '@/app/store';

/**
 * Custom options type that properly handles TData
 */
type UseMyOrdersOptions = Omit<
  UseInfiniteQueryOptions<
    PaginatedResponse<Order>,
    Error,
    Order[],
    readonly unknown[],
    number
  >,
  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
>;

export function useOrders(
  storeId: string,
  params?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Order>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.orders.list(storeId, params),
    queryFn: () => api.orders.getOrders(storeId, params),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch user's orders with infinite scroll
 */
export function useMyOrders(
  params?: Record<string, any>,
  options?: UseMyOrdersOptions
) {
  const { isAuthenticated } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.orders.my(params),
    queryFn: ({ pageParam = 1 }) =>
      api.users.getProfileOrders({ ...params, page: pageParam as number }),
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.hasNextPage ? lastPage.meta.page + 1 : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage?.meta?.hasPreviousPage ? firstPage.meta.page - 1 : undefined,
    initialPageParam: 1,
    enabled: isAuthenticated,
    ...options,
  });
}

export function useOrder(
  storeId: string,
  orderId: string,
  options?: Omit<UseQueryOptions<Order>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.orders.detail(storeId, orderId),
    queryFn: () => api.orders.getOrder(storeId, orderId),
    enabled: !!storeId && !!orderId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useUserOrders(
  storeId: string,
  userId: string,
  options?: Omit<UseQueryOptions<Order[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.orders.byUser(storeId, userId),
    queryFn: () => api.orders.getByUser(storeId, userId),
    enabled: !!storeId && !!userId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

// export function useOrderInventoryImpact(
//   storeId: string,
//   orderId: string,
//   options?: Omit<UseQueryOptions<InventoryImpactDto[]>, 'queryKey' | 'queryFn'>
// ) {
//   return useQuery({
//     queryKey: [
//       ...queryKeys.orders.detail(storeId, orderId),
//       'inventory-impact',
//     ],
//     queryFn: () => api.orders.getInventoryImpact(storeId, orderId),
//     enabled: !!storeId && !!orderId,
//     staleTime: 60 * 1000,
//     ...options,
//   });
// }
