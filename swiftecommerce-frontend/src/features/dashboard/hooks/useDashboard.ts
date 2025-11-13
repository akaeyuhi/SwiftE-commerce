import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';
import { Order } from '@/features/orders/types/order.types.ts';
import { Store } from '@/features/stores/types/store.types.ts';

export const getDashboardStats = async (userId: string) => {
  const userData = await api.users.getUser(userId);

  return {
    orders: userData.orders?.length,
    wishlist: userData.likes?.length,
    stores: userData.ownedStores?.length,
    reviews: userData.reviews?.length,
  };
};

export function useDashboardStats(
  userId: string,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => getDashboardStats(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useRecentOrders(
  limit = 3,
  options?: Omit<UseQueryOptions<Order[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentOrders(limit),
    queryFn: async () => {
      const response = await api.users.getProfileOrders();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useMyStores(
  userId: string,
  limit = 3,
  options?: Omit<UseQueryOptions<Store[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.dashboard.myStores(limit),
    queryFn: async () => {
      const response = await api.users.getUser(userId);
      return response.ownedStores!.slice(0, limit);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
