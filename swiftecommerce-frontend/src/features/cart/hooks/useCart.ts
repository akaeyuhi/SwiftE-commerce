import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Cart } from '../types/cart.types';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CreateCartData } from '@/features/cart/api/cartService.ts';

export function useServerCart(
  storeId: string,
  userId: string,
  options?: Omit<UseQueryOptions<Cart>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.cart.detail(storeId, userId),
    queryFn: () => api.cart.getOrCreateCart(storeId, userId),
    enabled: !!userId && !!storeId,
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useSyncCart(cartId: string, storeId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCartData) =>
      api.cart.syncCart(cartId, storeId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart.detail(storeId, userId),
      });
    },
    onError: () => toast.error('Failed to sync cart'),
  });
}
