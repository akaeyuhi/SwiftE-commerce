import { useMemo } from 'react';
import {
  calculateStatChange,
  calculateMultipleStatChanges,
  formatLargeNumber,
} from '@/shared/utils/statsCalculators';

interface UseStatsChangeOptions {
  /**
   * Which values are currency
   */
  currency?: Record<string, boolean>;
  /**
   * Decimal places
   */
  decimals?: number;
  /**
   * Format as short numbers (K, M, B)
   */
  shortFormat?: boolean;
}

/**
 * Hook to calculate stat changes
 */
export function useStatsChange(
  current: Record<string, number>,
  previous: Record<string, number>,
  options?: UseStatsChangeOptions
) {
  return useMemo(
    () =>
      calculateMultipleStatChanges(current, previous, {
        currency: options?.currency,
        decimals: options?.decimals,
      }),
    [current, previous, options]
  );
}

/**
 * Hook for single stat change
 */
export function useStatChange(
  current: number,
  previous: number,
  options?: {
    currency?: boolean;
    decimals?: number;
    shortFormat?: boolean;
  }
) {
  return useMemo(() => {
    const statChange = calculateStatChange(current, previous, {
      currency: options?.currency,
      decimals: options?.decimals,
    });

    if (options?.shortFormat) {
      return {
        ...statChange,
        value: formatLargeNumber(current),
      };
    }

    return statChange;
  }, [current, previous, options]);
}
