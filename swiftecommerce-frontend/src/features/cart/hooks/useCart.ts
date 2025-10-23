import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  CartItemDto,
  CreateCartDto,
  ShoppingCart,
} from '@/features/cart/types/cart.types.ts';

export function useCartOrCreate(
  storeId: string,
  userId: string,
  options?: Omit<UseQueryOptions<ShoppingCart>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.cart.detail(storeId, userId),
    queryFn: () => api.cart.getOrCreateCart(storeId, userId),
    enabled: !!storeId && !!userId,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useCartMutations(
  storeId: string,
  userId: string,
  cartId?: string
) {
  const queryClient = useQueryClient();

  const addItem = useMutation({
    mutationFn: (data: CartItemDto) => api.cart.addItem(storeId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.cart(storeId, userId));
      toast.success('Item added to cart');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add item to cart');
    },
  });

  const clearCart = useMutation({
    mutationFn: () => api.cart.clearCart(storeId, userId, cartId!),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.cart(storeId, userId));
      toast.success('Cart cleared successfully');
    },
    onError: () => toast.error('Failed to clear cart'),
  });

  const syncCart = useMutation({
    mutationFn: (data: CreateCartDto) =>
      api.cart.syncCart(storeId, userId, cartId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.cart(storeId, userId));
      toast.success('Cart synced successfully');
    },
    onError: () => toast.error('Failed to sync cart'),
  });

  return {
    addItem,
    clearCart,
    syncCart,
  };
}
