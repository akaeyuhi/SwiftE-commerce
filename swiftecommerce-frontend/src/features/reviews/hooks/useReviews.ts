import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { api, PaginatedResponse } from '@/lib/api';
import {
  CreateReviewDto,
  Review,
  UpdateReviewDto,
} from '@/features/reviews/types/reviews.types.ts';

export function useReviews(
  storeId: string,
  productId: string,
  params?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Review>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: queryKeys.reviews.product(storeId, productId, params),
    queryFn: () => api.reviews.getReviews(storeId, productId, params),
    enabled: !!storeId && !!productId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useReview(
  storeId: string,
  productId: string,
  reviewId: string,
  options?: Omit<UseQueryOptions<Review>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.reviews.product(storeId, productId), reviewId],
    queryFn: () => api.reviews.getReview(storeId, productId, reviewId),
    enabled: !!storeId && !!productId && !!reviewId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useReviewMutations(storeId: string, productId: string) {
  const queryClient = useQueryClient();

  const createReview = useMutation({
    mutationFn: (data: CreateReviewDto) =>
      api.reviews.createReview(storeId, productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(
        invalidateFeature.reviews(storeId, productId)
      );
      toast.success('Review submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit review');
    },
  });

  const updateReview = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReviewDto }) =>
      api.reviews.updateReview(storeId, productId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(
        invalidateFeature.reviews(storeId, productId)
      );
      toast.success('Review updated successfully');
    },
    onError: () => toast.error('Failed to update review'),
  });

  const deleteReview = useMutation({
    mutationFn: (reviewId: string) =>
      api.reviews.deleteReview(storeId, productId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries(
        invalidateFeature.reviews(storeId, productId)
      );
      toast.success('Review deleted successfully');
    },
    onError: () => toast.error('Failed to delete review'),
  });

  return {
    createReview,
    updateReview,
    deleteReview,
  };
}
