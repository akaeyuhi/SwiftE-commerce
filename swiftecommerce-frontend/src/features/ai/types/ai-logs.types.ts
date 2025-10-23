import { Store } from '@/features/stores/types/store.types.ts';
import { User } from '@/features/users/types/users.types.ts';

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

export interface AiLog {
  id: string;
  userId: string;
  user: User;
  storeId: string;
  store: Store;
  feature: string;
  details?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
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
