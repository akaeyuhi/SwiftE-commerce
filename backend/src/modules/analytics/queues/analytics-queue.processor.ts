import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsEventRepository } from '../repositories/analytics-event.repository';
import { AnalyticsJobPayload } from './types';
import { RecordEventDto } from '../dto/record-event.dto';

/**
 * AnalyticsQueueProcessor
 *
 * - processes jobs named 'record'
 * - supports job.data being a single RecordEventDto or an array
 * - writes to analytics_events using AnalyticsEventRepository
 */
@Injectable()
@Processor('analytics')
export class AnalyticsQueueProcessor {
  private readonly logger = new Logger(AnalyticsQueueProcessor.name);

  constructor(private readonly eventsRepo: AnalyticsEventRepository) {}

  @Process('record')
  async handleRecord(job: Job<AnalyticsJobPayload>) {
    const payload = job.data;
    try {
      const rows: RecordEventDto[] = Array.isArray(payload)
        ? payload
        : [payload];

      // Convert to entities array and bulk-save
      const entities = rows.map((r) =>
        this.eventsRepo.create({
          storeId: r.storeId ?? null,
          productId: r.productId ?? null,
          userId: r.userId ?? null,
          eventType: r.eventType,
          value: r.value ?? null,
          meta: r.meta ?? null,
        } as any)
      );

      // Save many at once (TypeORM accepts arrays)
      await this.eventsRepo.insertMany(entities as any);

      // optionally log metrics
      this.logger.debug(
        `Persisted ${entities.length} analytics events (job ${job.id})`
      );

      return { ok: true, inserted: entities.length };
    } catch (err) {
      this.logger.error(
        `Failed to process analytics job ${job.id}: ${err?.message}`,
        err?.stack
      );
      throw err; // allow Bull to retry per JobOptions
    }
  }
}
