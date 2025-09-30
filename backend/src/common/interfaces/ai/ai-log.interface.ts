export interface LogQueryOptions {
  limit?: number;
  offset?: number;
  feature?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasDetails?: boolean;
}

export interface UsageStats {
  totalLogs: number;
  byFeature: Record<string, number>;
  byUser: Record<string, number>;
  byStore: Record<string, number>;
  dailyUsage: Array<{ date: string; count: number }>;
  topFeatures: Array<{ feature: string; count: number; percentage: number }>;
  averageDetailsSize: number;
}
