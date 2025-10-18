import { RecordEventDto } from '../dto/record-event.dto';

export type AnalyticsJobPayload = RecordEventDto | RecordEventDto[];

export interface AnalyticsJobData {
  events: RecordEventDto[];
  batchId?: string;
  priority?: number;
  userId?: string;
  storeId?: string;
  metadata?: Record<string, any>;
}

export enum AnalyticsJobType {
  RECORD_SINGLE = 'record_single',
  RECORD_BATCH = 'record_batch',
  AGGREGATE_DAILY = 'aggregate_daily',
  CLEANUP_OLD = 'cleanup_old',
  PROCESS_METRICS = 'process_metrics',
  GENERATE_REPORT = 'generate_report',
}

export enum AnalyticsEventType {
  VIEW = 'view',
  LIKE = 'like',
  UNLIKE = 'unlike',
  ADD_TO_CART = 'addToCart',
  PURCHASE = 'purchase',
  CHECKOUT = 'checkout',
  CLICK = 'click',
  CUSTOM = 'custom',
}
