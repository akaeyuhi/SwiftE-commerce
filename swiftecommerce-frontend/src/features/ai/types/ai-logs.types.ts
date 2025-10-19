export interface AILogEntry {
  id: string;
  storeId: string;
  featureType: 'generator' | 'predictor';
  action: string;
  userId?: string;
  metadata?: Record<string, any>;
  success: boolean;
  error?: string;
  createdAt: string;
}

export interface UsageStats {
  total: number;
  byFeature: {
    generator: number;
    predictor: number;
  };
  byAction: Record<string, number>;
  successRate: number;
}

export interface DailyUsage {
  date: string;
  total: number;
  generator: number;
  predictor: number;
}

export interface ErrorLog {
  error: string;
  count: number;
  lastOccurred: string;
}
