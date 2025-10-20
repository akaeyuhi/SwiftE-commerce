import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { invalidateFeature, queryKeys } from '@/lib/queryKeys';
import { CreateReviewRequest } from '../types/reviews.types';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function useReviews(
  storeId: string,
  productId: string,
  filters?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.reviews.product(storeId, productId, filters),
    queryFn: () => api.reviews.getReviews(storeId, productId, filters),
    enabled: !!productId && !!storeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useCreateReview(storeId: string, productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReviewRequest) =>
      api.reviews.createReview(storeId, productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(
        invalidateFeature.reviews(storeId, productId)
      );
      toast.success('Review added successfully');
    },
    onError: () => toast.error('Failed to add review'),
  });
}
