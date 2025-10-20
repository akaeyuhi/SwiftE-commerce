import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { StoreAnalytics, ConversionMetrics } from '../types/analytics.types';
import { api } from '@/lib/api';

export function useStoreAnalytics(
  storeId: string,
  params?: any,
  options?: Omit<UseQueryOptions<StoreAnalytics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.store(storeId, params),
    queryFn: () => api.analytics.getStoreAnalytics(storeId, params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useConversionMetrics(
  storeId: string,
  params?: any,
  options?: Omit<UseQueryOptions<ConversionMetrics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.conversion(storeId, params),
    queryFn: () => api.analytics.getStoreConversion(storeId, params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useFunnelAnalysis(
  storeId: string,
  params?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.funnel(storeId, params),
    queryFn: () => api.analytics.getFunnelAnalysis(storeId, params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useTopProducts(
  storeId: string,
  params?: any,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.analytics.store(storeId, params), 'top-products'],
    queryFn: () => api.analytics.getTopPerformingProducts(storeId, params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
