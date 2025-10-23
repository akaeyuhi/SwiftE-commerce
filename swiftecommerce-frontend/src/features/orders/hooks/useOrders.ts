import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { api, PaginatedResponse } from '@/lib/api';
import { Order } from '@/features/orders/types/order.types.ts';

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
