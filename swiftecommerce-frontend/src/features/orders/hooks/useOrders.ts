import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Order, OrderFilters } from '../types/order.types';
import { PaginatedResponse } from '@/lib/api/types';
import { api } from '@/lib/api';

export function useOrders(
  storeId: string,
  filters?: OrderFilters,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Order>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.orders.list(storeId, filters),
    queryFn: () => api.orders.getOrders(storeId, filters),
    staleTime: 60 * 1000,
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
    enabled: !!orderId && !!storeId,
    staleTime: 30 * 1000,
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
    enabled: !!userId && !!storeId,
    staleTime: 60 * 1000,
    ...options,
  });
}
