/**
 * Represents stat change information
 */
export interface StatChangeInfo {
  value: number | string;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'neutral';
  formattedChange: string;
  formattedChangePercentage: string;
}

/**
 * Calculate percentage change between two values
 * @param current Current value
 * @param previous Previous value
 * @returns Percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calculate absolute change between two values
 * @param current Current value
 * @param previous Previous value
 * @returns Absolute change
 */
export function calculateAbsoluteChange(
  current: number,
  previous: number
): number {
  return current - previous;
}

/**
 * Get trend direction based on change value
 * @param change Change value
 * @returns 'up' | 'down' | 'neutral'
 */
export function getTrendDirection(change: number): 'up' | 'down' | 'neutral' {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'neutral';
}

/**
 * Format change value with sign
 * @param change Change value
 * @param prefix Prefix to add (e.g., '$', '%')
 * @returns Formatted string like "+$100" or "-10%"
 */
export function formatChange(change: number, prefix: string = ''): string {
  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  const absValue = Math.abs(change);
  return `${sign}${prefix}${absValue}`;
}

/**
 * Calculate stat change with all information
 * @param current Current value
 * @param previous Previous value
 * @param options Formatting options
 * @returns Stat change info object
 */
export function calculateStatChange(
  current: number,
  previous: number,
  options?: {
    currency?: boolean;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  }
): StatChangeInfo {
  const change = calculateAbsoluteChange(current, previous);
  const changePercentage = calculatePercentageChange(current, previous);
  const trend = getTrendDirection(change);

  const {
    currency = false,
    decimals = 2,
    prefix = '',
    suffix = '',
  } = options || {};

  let formattedChange = formatChange(change, currency ? '$' : '');
  let formattedChangePercentage = `${formatChange(changePercentage)}%`;

  if (decimals !== undefined) {
    const changeNum = parseFloat(change.toFixed(decimals));
    const percentNum = parseFloat(changePercentage.toFixed(decimals));
    formattedChange = formatChange(changeNum, currency ? '$' : '');
    formattedChangePercentage = `${formatChange(percentNum)}%`;
  }

  return {
    value: current,
    change,
    changePercentage,
    trend,
    formattedChange: `${prefix}${formattedChange}${suffix}`,
    formattedChangePercentage,
  };
}

/**
 * Calculate multiple stat changes at once
 * @param current Current values object
 * @param previous Previous values object
 * @param options
 * @returns Object with stat changes keyed by property name
 */
export function calculateMultipleStatChanges(
  current: Record<string, number>,
  previous: Record<string, number>,
  options?: {
    currency?: Record<string, boolean>;
    decimals?: number;
  }
): Record<string, StatChangeInfo> {
  const result: Record<string, StatChangeInfo> = {};

  for (const key in current) {
    if (key in previous) {
      const isCurrency = options?.currency?.[key] ?? false;
      result[key] = calculateStatChange(current[key]!, previous[key]!, {
        currency: isCurrency,
        decimals: options?.decimals,
      });
    }
  }

  return result;
}

/**
 * Calculate growth rate (CAGR - Compound Annual Growth Rate)
 * @param startValue Starting value
 * @param endValue Ending value
 * @param periods Number of periods
 * @returns CAGR percentage
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  periods: number
): number {
  if (startValue === 0 || periods === 0) return 0;
  const cagrValue = Math.pow(endValue / startValue, 1 / periods) - 1;
  return cagrValue * 100;
}

/**
 * Calculate moving average
 * @param values Array of values
 * @param period Period for moving average
 * @returns Array of moving averages
 */
export function calculateMovingAverage(
  values: number[],
  period: number = 3
): number[] {
  if (values.length < period) return values;

  const result: number[] = [];

  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }

  return result;
}

/**
 * Calculate average, min, max from array
 * @param values Array of values
 * @returns Object with statistics
 */
export function calculateBasicStats(values: number[]) {
  if (values.length === 0) {
    return { average: 0, min: 0, max: 0, total: 0, count: 0 };
  }

  const total = values.reduce((a, b) => a + b, 0);
  const average = total / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    average,
    min,
    max,
    total,
    count: values.length,
  };
}

/**
 * Format large numbers with abbreviations
 * @param value Value to format
 * @returns Formatted string like "1.2K", "3.5M"
 */
export function formatLargeNumber(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toFixed(0);
}

/**
 * Format currency value
 * @param value Value to format
 * @param currency Currency code (default: 'USD')
 * @param locale Locale (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage value
 * @param value Value to format (0-100 or 0-1)
 * @param decimals Decimal places
 * @param normalize If true, multiply by 100
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  normalize: boolean = false
): string {
  const actualValue = normalize ? value * 100 : value;
  return `${actualValue.toFixed(decimals)}%`;
}

/**
 * Calculate time-based statistics
 * @param values Array of values with timestamps
 * @param timeWindow Time window in milliseconds
 * @returns Statistics for the time window
 */
export function calculateTimeBasedStats(
  values: Array<{ value: number; timestamp: Date }>,
  timeWindow: number = 24 * 60 * 60 * 1000 // 24 hours
) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - timeWindow);

  const recentValues = values
    .filter((v) => new Date(v.timestamp) >= cutoff)
    .map((v) => v.value);

  return calculateBasicStats(recentValues);
}

/**
 * Determine if change is good or bad (for trend indicator)
 * @param trend Trend direction
 * @param isPositiveGood Is upward trend considered good?
 * @returns Whether the trend is positive
 */
export function isPositiveTrend(
  trend: 'up' | 'down' | 'neutral',
  isPositiveGood: boolean = true
): boolean {
  if (trend === 'neutral') return false;
  return isPositiveGood ? trend === 'up' : trend === 'down';
}

/**
 * Calculate year-over-year growth
 * @param current Current year value
 * @param previous Previous year value
 * @returns YoY growth percentage
 */
export function calculateYoYGrowth(current: number, previous: number): number {
  return calculatePercentageChange(current, previous);
}

/**
 * Calculate quarter-over-quarter growth
 * @param current Current quarter value
 * @param previous Previous quarter value
 * @returns QoQ growth percentage
 */
export function calculateQoQGrowth(current: number, previous: number): number {
  return calculatePercentageChange(current, previous);
}

/**
 * Calculate month-over-month growth
 * @param current Current month value
 * @param previous Previous month value
 * @returns MoM growth percentage
 */
export function calculateMoMGrowth(current: number, previous: number): number {
  return calculatePercentageChange(current, previous);
}
