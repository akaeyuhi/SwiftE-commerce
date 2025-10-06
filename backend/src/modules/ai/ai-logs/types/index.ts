export interface RecordAiLogParams {
  userId?: string | null;
  storeId?: string | null;
  feature: string;
  prompt?: string | null;
  details?: Record<string, any> | null;
}

export interface LogFilterOptions {
  storeId?: string;
  userId?: string;
  feature?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasDetails?: boolean;
}

export type LogUsageStatsFilterOptions = Omit<LogFilterOptions, 'hasDetails'>;
export type LogTopFeaturesFilterOptions = Omit<
  LogUsageStatsFilterOptions,
  'feature'
>;
export type LogDailyUsageFilterOptions = Omit<
  LogUsageStatsFilterOptions,
  'dateTo' | 'dateFrom'
>;
export type ErrorLogsFilterOptions = LogUsageStatsFilterOptions;

export interface UsageTrend {
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  insights: string[];
  recommendations: string[];
}

export interface HealthCheckReport {
  healthy: boolean;
  metrics: {
    recentLogsCount: number;
    errorRate: number;
    averageLogSize: number;
  };
}

export interface DailyUsageStats {
  date: string;
  count: number;
  uniqueUsers: number;
  uniqueStores: number;
  topFeatures: string[];
}
