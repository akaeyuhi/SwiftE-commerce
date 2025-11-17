import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';
import { Order } from '@/features/orders/types/order.types.ts';
import { Store, StoreRole } from '@/features/stores/types/store.types.ts';

const getOwnedOrModerated = (storeRoles: StoreRole[]) => [
  ...storeRoles.map((role) => ({
    ...role.store,
  })),
];

export function useDashboardStats(
  userId: string,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const data = await api.users.getUserDashboard(userId);
      return {
        wishlist: data.likes,
        orders: data.orders,
        stores: getOwnedOrModerated(data.roles!),
        reviews: data.reviews,
      };
    },
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
      const response = await api.users.getUserDashboard(userId);
      return getOwnedOrModerated(response.roles!).slice(0, limit);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
