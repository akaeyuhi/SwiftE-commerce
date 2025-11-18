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
import { PaginatedResponse } from '@/shared/types/common.types.ts';

/**
 * Fetches a single cart for a user in a specific store, creating it if it doesn't exist.
 * @param storeId - The ID of the store.
 * @param userId - The ID of the user.
 * @param options - React Query options.
 */
export function useCartOrCreate(
  storeId: string,
  userId: string,
  options?: Omit<UseQueryOptions<ShoppingCart>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.cart.detail(storeId, userId),
    queryFn: () => api.cart.getOrCreateCart(storeId, userId),
    enabled: !!storeId && !!userId,
    ...options,
  });
}

/**
 * Fetches all carts for a user across all stores.
 * @param userId - The ID of the user.
 * @param options - React Query options.
 */
export function useUserMergedCarts(
  userId: string,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<ShoppingCart>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.cart.merged(userId),
    queryFn: () => api.cart.getUserMergedCarts(userId),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Provides mutation hooks for all cart-related actions.
 * Mutations are flexible and require all necessary IDs to be passed,
 * allowing them to operate on any cart.
 * @param userId - The ID of the current user.
 */
export function useCartMutations(userId: string) {
  const queryClient = useQueryClient();

  const onMutationSuccess = (storeId: string) => {
    queryClient.invalidateQueries(invalidateFeature.cart(storeId, userId));
    queryClient.invalidateQueries({ queryKey: queryKeys.cart.merged(userId) });
  };

  const addItem = useMutation({
    mutationFn: (data: { storeId: string; item: CartItemDto }) =>
      api.cart.addItem(data.storeId, userId, data.item),
    onSuccess: (_, { storeId, item }) => {
      onMutationSuccess(storeId);
      toast.success(`Added ${item.quantity} item(s) to cart`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add item to cart');
    },
  });

  const removeItem = useMutation({
    mutationFn: (data: { storeId: string; cartId: string; itemId: string }) =>
      api.cart.removeItem(data.storeId, userId, data.cartId, data.itemId),
    onSuccess: (_, { storeId }) => {
      onMutationSuccess(storeId);
      toast.success('Item removed from cart');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove item from cart');
    },
  });

  const updateQuantity = useMutation({
    mutationFn: (data: {
      storeId: string;
      cartId: string;
      itemId: string;
      quantity: number;
    }) =>
      api.cart.updateQuantity(data.storeId, userId, data.cartId, data.itemId, {
        quantity: data.quantity,
      }),
    onSuccess: (_, { storeId }) => {
      onMutationSuccess(storeId);
      toast.success('Cart updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update cart');
    },
  });

  const clearCart = useMutation({
    mutationFn: (storeId: string) => api.cart.clearCart(storeId, userId),
    onSuccess: (_, storeId) => {
      onMutationSuccess(storeId);
      toast.success('Cart cleared successfully');
    },
    onError: () => toast.error('Failed to clear cart'),
  });

  const syncCart = useMutation({
    mutationFn: (data: { storeId: string; payload: CreateCartDto }) =>
      api.cart.syncCart(data.storeId, userId, data.payload),
    onSuccess: (_, { storeId }) => {
      onMutationSuccess(storeId);
      toast.success('Cart synced successfully');
    },
    onError: () => toast.error('Failed to sync cart'),
  });

  return {
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    syncCart,
  };
}
