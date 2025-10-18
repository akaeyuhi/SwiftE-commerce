import { Injectable } from '@nestjs/common';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { AnalyticsEventRepository } from '../repositories/analytics-event.repository';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';

@Injectable()
export class EventTrackingService {
  constructor(
    private readonly queueService: AnalyticsQueueService,
    private readonly eventsRepo: AnalyticsEventRepository
  ) {}

  async trackEvent(event: RecordEventDto): Promise<void> {
    await this.queueService.addEvent(event);
  }

  async recordEvent(dto: RecordEventDto) {
    return this.eventsRepo.createEntity({
      storeId: dto.storeId ?? null,
      productId: dto.productId ?? null,
      userId: dto.userId ?? null,
      eventType: dto.eventType,
      value: dto.value ?? null,
      meta: dto.meta ?? null,
      invokedOn: dto.invokedOn ?? (dto.productId ? 'product' : 'store'),
    } as any);
  }

  async batchTrack(events: RecordEventDto[]) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const event of events) {
      try {
        await this.trackEvent(event);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ event, error: error.message });
      }
    }

    return results;
  }
}
