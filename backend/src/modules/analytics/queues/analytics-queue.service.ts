import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { RecordEventDto } from '../dto/record-event.dto';
import { AnalyticsEventType } from '../entities/analytics-event.entity';

@Injectable()
export class AnalyticsQueueService {
  private readonly logger = new Logger(AnalyticsQueueService.name);

  private readonly defaultJobOptions: JobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { age: 60 * 60, count: 1000 },
    removeOnFail: { age: 60 * 60 * 24, count: 1000 },
  };

  constructor(@InjectQueue('analytics') private readonly queue: Queue) {}

  async addEvent(event: RecordEventDto, opts?: Partial<JobOptions>) {
    const jobOptions = { ...this.defaultJobOptions, ...(opts ?? {}) };
    return this.queue.add('record', event, jobOptions);
  }

  async addBatch(events: RecordEventDto[], opts?: Partial<JobOptions>) {
    if (!events || events.length === 0) return null;
    const jobOptions = { ...this.defaultJobOptions, ...(opts ?? {}) };
    // store array payload; processor should detect array and persist many
    return this.queue.add('record_batch', { events }, jobOptions);
  }

  // Convenience wrappers:
  async recordView(
    storeId?: string,
    productId?: string,
    userId?: string,
    meta?: any
  ) {
    const ev: RecordEventDto = {
      storeId: storeId ?? null,
      productId: productId ?? null,
      userId: userId ?? null,
      eventType: AnalyticsEventType.VIEW,
      invokedOn: productId ? 'product' : 'store',
      value: null,
      meta: meta ?? null,
    };
    return this.addEvent(ev);
  }

  async recordLike(
    storeId?: string,
    productId?: string,
    userId?: string,
    meta?: any
  ) {
    const ev: RecordEventDto = {
      storeId: storeId ?? null,
      productId: productId ?? null,
      userId: userId ?? null,
      eventType: AnalyticsEventType.LIKE,
      invokedOn: productId ? 'product' : 'store',
      value: null,
      meta: meta ?? null,
    };
    return this.addEvent(ev);
  }

  async recordAddToCart(
    storeId: string,
    productId: string,
    userId?: string,
    quantity = 1,
    meta?: any
  ) {
    const ev: RecordEventDto = {
      storeId: storeId ?? null,
      productId: productId ?? null,
      userId: userId ?? null,
      eventType: AnalyticsEventType.ADD_TO_CART,
      invokedOn: productId ? 'product' : 'store',
      value: quantity,
      meta: meta ?? null,
    };
    return this.addEvent(ev);
  }

  async recordPurchase(
    storeId: string,
    productId: string,
    userId: string,
    amount = 0,
    meta?: any
  ) {
    const ev: RecordEventDto = {
      storeId: storeId ?? null,
      productId: productId ?? null,
      userId: userId ?? null,
      eventType: AnalyticsEventType.PURCHASE,
      invokedOn: productId ? 'product' : 'store',
      value: amount,
      meta: meta ?? null,
    };
    return this.addEvent(ev);
  }

  async recordClick(
    storeId?: string,
    productId?: string,
    userId?: string,
    meta?: any
  ) {
    const ev: RecordEventDto = {
      storeId: storeId ?? null,
      productId: productId ?? null,
      userId: userId ?? null,
      eventType: AnalyticsEventType.CLICK,
      invokedOn: productId ? 'product' : 'store',
      value: null,
      meta: meta ?? null,
    };
    return this.addEvent(ev);
  }

  // drain/close
  async close() {
    try {
      await this.queue.close();
    } catch (err) {
      this.logger.error('Failed to close analytics queue: ' + err?.message);
    }
  }
}
