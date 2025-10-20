import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function useTrendingProducts(
  storeId: string,
  params?: any,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.ai.trending(storeId),
    queryFn: () => api.ai.predictor.getTrendingProducts(storeId, params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useGenerateNames(storeId: string) {
  return useMutation({
    mutationFn: (data: any) => api.ai.generator.generateNames(storeId, data),
    onError: () => toast.error('Failed to generate names'),
  });
}

export function useGenerateDescription(storeId: string) {
  return useMutation({
    mutationFn: (data: any) =>
      api.ai.generator.generateDescription(storeId, data),
    onError: () => toast.error('Failed to generate description'),
  });
}

export function usePredictDemand(storeId: string) {
  return useMutation({
    mutationFn: (data: any) => api.ai.predictor.predictSingle(storeId, data),
    onError: () => toast.error('Failed to predict demand'),
  });
}
