import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  GenerateCustomRequest,
  GenerateDescriptionRequest,
  GenerateIdeasRequest,
  GenerateNamesRequest,
} from '@/features/ai/types/ai-generator.types.ts';

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
    mutationFn: (data: GenerateNamesRequest) =>
      api.ai.generator.generateNames(storeId, data),
    onError: () => toast.error('Failed to generate names'),
  });
}

export function useGenerateDescription(storeId: string) {
  return useMutation({
    mutationFn: (data: GenerateDescriptionRequest) =>
      api.ai.generator.generateDescription(storeId, data),
    onError: () => toast.error('Failed to generate description'),
  });
}

export function useGenerateIdeas(storeId: string) {
  return useMutation({
    mutationFn: (data: GenerateIdeasRequest) =>
      api.ai.generator.generateIdeas(storeId, data),
    onError: () => toast.error('Failed to generate ideas'),
  });
}

export function useGenerateCustom(storeId: string) {
  return useMutation({
    mutationFn: (data: GenerateCustomRequest) =>
      api.ai.generator.generateCustom(storeId, data),
    onError: () => toast.error('Failed to generate custom content'),
  });
}

export function usePredictDemand(storeId: string) {
  return useMutation({
    mutationFn: (data: any) => api.ai.predictor.predictSingle(storeId, data),
    onError: () => toast.error('Failed to predict demand'),
  });
}

export function useGenerateWholeProduct(storeId: string) {
  return useMutation({
    mutationFn: (data: { idea: string }) =>
      api.ai.generator.generateWholeProduct(storeId, data),
    onError: () => toast.error('Failed to generate product'),
  });
}

export function useGenerateImage(storeId: string) {
  return useMutation({
    mutationFn: (data: { prompt: string }) =>
      api.ai.generator.generateImage(storeId, data),
    onError: () => toast.error('Failed to generate image'),
  });
}
