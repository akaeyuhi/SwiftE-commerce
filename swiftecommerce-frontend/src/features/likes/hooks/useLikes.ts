import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Like } from '@/features/likes/types/likes.types.ts';
import { useWishlist } from '@/app/store';

export function useLikes(
  userId: string,
  options?: Omit<UseQueryOptions<Like[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.likes.user(userId),
    queryFn: () => api.likes.getUserLikes(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useLikeMutations(userId: string) {
  const queryClient = useQueryClient();
  const { addToWishlist, removeFromWishlist, followStore, unfollowStore } =
    useWishlist();

  const likeProduct = useMutation({
    mutationFn: (productId: string) => api.likes.likeProduct(userId, productId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invalidateFeature.likes(userId).queryKey });
      addToWishlist(data.productId!);
      toast.success('Product liked');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to like product');
    },
  });

  const likeStore = useMutation({
    mutationFn: (storeId: string) => api.likes.likeStore(userId, storeId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invalidateFeature.likes(userId).queryKey });
      followStore(data.storeId!);
      toast.success('Store followed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to follow store');
    },
  });

  const removeLike = useMutation({
    mutationFn: (likeId: string) => api.likes.unlike(userId, likeId),
    onMutate: async (likeId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.likes.user(userId) });
      const previousLikes = queryClient.getQueryData<Like[]>(
        queryKeys.likes.user(userId)
      );
      const likeToRemove = previousLikes?.find((like) => like.id === likeId);

      if (likeToRemove?.productId) {
        removeFromWishlist(likeToRemove.productId);
      }
      if (likeToRemove?.storeId) {
        unfollowStore(likeToRemove.storeId);
      }

      return { previousLikes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateFeature.likes(userId).queryKey });
      toast.success('Like removed');
    },
    onError: (err, likeId, context) => {
      if (context?.previousLikes) {
        const likeToRestore = context.previousLikes.find(
          (like) => like.id === likeId
        );
        if (likeToRestore?.productId) {
          addToWishlist(likeToRestore.productId);
        }
        if (likeToRestore?.storeId) {
          followStore(likeToRestore.storeId);
        }
      }
      toast.error('Failed to remove like');
    },
  });

  return {
    likeProduct,
    likeStore,
    removeLike,
  };
}
