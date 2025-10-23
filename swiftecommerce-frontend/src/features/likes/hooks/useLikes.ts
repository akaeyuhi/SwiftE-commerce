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

  const likeProduct = useMutation({
    mutationFn: (productId: string) => api.likes.likeProduct(userId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.likes(userId));
      toast.success('Product liked');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to like product');
    },
  });

  const likeStore = useMutation({
    mutationFn: (storeId: string) => api.likes.likeStore(userId, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.likes(userId));
      toast.success('Store liked');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to like store');
    },
  });

  const removeLike = useMutation({
    mutationFn: (likeId: string) => api.likes.unlike(userId, likeId),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.likes(userId));
      toast.success('Like removed');
    },
    onError: () => toast.error('Failed to remove like'),
  });

  return {
    likeProduct,
    likeStore,
    removeLike,
  };
}
