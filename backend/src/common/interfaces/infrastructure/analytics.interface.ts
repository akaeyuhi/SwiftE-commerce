export interface DateRangeOptions {
  from?: string;
  to?: string;
}

export interface AggregationResult {
  [key: string]: number;
}

export interface AnalyticsEvent<Data = any> {
  type: string;
  data: Data;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}
