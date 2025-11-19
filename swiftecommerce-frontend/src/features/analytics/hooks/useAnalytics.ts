import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';
import {
  AnalyticsEvent,
  AnalyticsParams,
  StoreConversionMetrics,
  TimePeriod,
  TopProductResult,
} from '../types/analytics.types';
import { sub, format } from 'date-fns';

/**
 * Converts a TimePeriod string ('day', 'week', 'month', 'year')
 * into 'from' and 'to' date strings for API calls.
 */
const getTimeRangeParams = (timeRange: TimePeriod): AnalyticsParams => {
  const now = new Date();
  const to = format(now, 'yyyy-MM-dd');
  let from: Date;

  switch (timeRange) {
    case 'day':
      from = sub(now, { days: 1 });
      break;
    case 'week':
      from = sub(now, { weeks: 1 });
      break;
    case 'year':
      from = sub(now, { years: 1 });
      break;
    case 'month':
    default:
      from = sub(now, { months: 1 });
      break;
  }

  return { from: format(from, 'yyyy-MM-dd'), to };
};

/**
 * Fetches quick, cached stats for a store. Does not use a time range
 * as it relies on denormalized data on the Store entity.
 */
export function useStoreQuickStats(storeId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.detail(storeId, 'quick-stats'),
    queryFn: () => api.analytics.getStoreQuickStats(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetches detailed conversion metrics for a store over a given time period.
 */
export function useConversionMetrics(storeId: string, timeRange: TimePeriod) {
  const params = getTimeRangeParams(timeRange);
  return useQuery<StoreConversionMetrics, Error>({
    queryKey: queryKeys.analytics.detail(storeId, 'conversion', params),
    queryFn: () => api.analytics.getStoreConversionMetrics(storeId, params),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches revenue and order trends for a given time period.
 */
export function useRevenueTrends(storeId: string, timeRange: TimePeriod) {
  const params = getTimeRangeParams(timeRange);
  return useQuery({
    queryKey: queryKeys.analytics.detail(storeId, 'revenue-trends', params),
    queryFn: () => api.analytics.getRevenueTrends(storeId, params),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches sales data aggregated by category for a given time period.
 */
export function useCategorySales(storeId: string, timeRange: TimePeriod) {
  const params = getTimeRangeParams(timeRange);
  return useQuery({
    queryKey: queryKeys.analytics.detail(storeId, 'category-sales', params),
    queryFn: () => api.analytics.getCategorySales(storeId, params),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches the top-performing products by conversion rate for a given time period.
 */
export function useTopProductsByConversion(
  storeId: string,
  timeRange: TimePeriod
) {
  const params = { ...getTimeRangeParams(timeRange), limit: 5 };
  return useQuery<TopProductResult[], Error>({
    queryKey: queryKeys.analytics.detail(storeId, 'top-products', params),
    queryFn: () => api.analytics.getTopPerformingProducts(storeId, params),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Provides mutations for recording analytics events.
 */
export function useAnalyticsMutations(storeId: string) {
  const queryClient = useQueryClient();

  const invalidateStoreAnalytics = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.analytics.store(storeId),
    });
  };

  const recordEvent = useMutation({
    mutationFn: (event: AnalyticsEvent) =>
      api.analytics.recordEvent(storeId, event),
    onSuccess: invalidateStoreAnalytics,
    onError: (error: any) => {
      console.error('Failed to record analytics event:', error);
    },
  });

  const recordEventsBatch = useMutation({
    mutationFn: (data: AnalyticsEvent[]) =>
      api.analytics.recordEventsBatch(storeId, data),
    onSuccess: invalidateStoreAnalytics,
    onError: (error: any) => {
      console.error('Failed to record analytics events:', error);
    },
  });

  return {
    recordEvent,
    recordEventsBatch,
  };
}

// NOTE: Other hooks like useFunnelAnalysis, useCohortAnalysis, etc., can be added here
// following the same pattern if they are needed in the UI. For now, only the hooks
// required by the visible components have been refactored.
