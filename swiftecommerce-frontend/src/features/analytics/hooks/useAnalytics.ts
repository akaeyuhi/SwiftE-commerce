import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';
import {
  AnalyticsEvent,
  AnalyticsParams,
  CohortAnalysis,
  ConversionMetrics,
  FunnelAnalysis,
  ProductPerformance,
  TopProductsParams,
  UserJourney,
} from '../types/analytics.types';

export function useStoreQuickStats(
  storeId: string,
  timeRange: Extract<AnalyticsParams, 'period'>,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.analytics.store(storeId), 'quick-stats', timeRange],
    queryFn: () =>
      api.analytics.getStoreQuickStats(storeId, { period: timeRange }),
    enabled: !!storeId,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useCategorySales(
  storeId: string,
  params?: AnalyticsParams,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.analytics.store(storeId), 'category-sales', params],
    queryFn: () => api.analytics.getCategorySales(storeId, params),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useStoreInsights(
  storeId: string,
  params?: AnalyticsParams,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.analytics.store(storeId), 'insights', params],
    queryFn: () => api.analytics.getStoreInsights(storeId, params),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useStoreAnalytics(
  storeId: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<Record<string, any>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.store(storeId, params),
    queryFn: () => api.analytics.getStoreAnalytics(storeId, params),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useConversionMetrics(
  storeId: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<ConversionMetrics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.conversion(storeId, params),
    queryFn: () => api.analytics.getStoreConversion(storeId, params),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useRatingMetrics(
  storeId: string,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.analytics.store(storeId), 'ratings'],
    queryFn: () => api.analytics.getStoreRatings(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useTopProductsByViews(
  storeId: string,
  params?: TopProductsParams,
  options?: Omit<UseQueryOptions<ProductPerformance[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.analytics.store(storeId), 'top-views', params],
    queryFn: () => api.analytics.getTopProductsByViews(storeId, params),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useTopProductsByConversion(
  storeId: string,
  params?: TopProductsParams,
  options?: Omit<UseQueryOptions<ProductPerformance[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.analytics.store(storeId), 'top-conversion', params],
    queryFn: () => api.analytics.getTopProductsByConversion(storeId, params),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useFunnelAnalysis(
  storeId: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<FunnelAnalysis>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.funnel(storeId, params),
    queryFn: () => api.analytics.getFunnelAnalysis(storeId, params),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useRevenueTrends(
  storeId: string,
  params?: AnalyticsParams,
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.revenueTrends(storeId, params),
    queryFn: () => api.analytics.getRevenueTrends(storeId, params),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCohortAnalysis(
  storeId: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<CohortAnalysis>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.analytics.cohort(storeId, params),
    queryFn: () => api.analytics.getCohortAnalysis(storeId, params),
    enabled: !!storeId,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useUserJourney(
  storeId: string,
  params?: AnalyticsParams,
  options?: Omit<UseQueryOptions<UserJourney>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.analytics.store(storeId), 'user-journey', params],
    queryFn: () => api.analytics.getUserJourney(storeId, params),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useAnalyticsMutations(storeId: string) {
  const queryClient = useQueryClient();

  const recordEvent = useMutation({
    mutationFn: (event: AnalyticsEvent) =>
      api.analytics.recordEvent(storeId, event),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.store(storeId),
      });
    },
    onError: (error: any) => {
      console.error('Failed to record analytics event:', error);
    },
  });

  const recordEventsBatch = useMutation({
    mutationFn: (data: AnalyticsEvent[]) =>
      api.analytics.recordEventsBatch(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.store(storeId),
      });
    },
    onError: (error: any) => {
      console.error('Failed to record analytics events:', error);
    },
  });

  return {
    recordEvent,
    recordEventsBatch,
  };
}
