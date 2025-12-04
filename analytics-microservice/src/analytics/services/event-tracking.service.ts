import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RecordEventDto } from 'dto/record-event.dto';
import { AnalyticsEvent } from 'entities/analytics-event.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EventTrackingService {
  private readonly logger = new Logger(EventTrackingService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly eventRepo: Repository<AnalyticsEvent>
  ) {}

  /**
   * Alias for trackEvent to satisfy BaseAnalyticsService contract
   */
  async recordEvent(dto: RecordEventDto): Promise<void> {
    return this.trackEvent(dto);
  }

  async trackEvent(dto: RecordEventDto): Promise<void> {
    try {
      const entity = this.mapDtoToEntity(dto);
      await this.eventRepo.save(entity);
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`, error.stack);
    }
  }

  async batchTrack(events: RecordEventDto[]) {
    // 1. Handle empty case strictly matching return type
    if (!events.length) {
      return { success: 0, failed: 0, errors: [] };
    }

    const entities = events.map((dto) => this.mapDtoToEntity(dto));

    try {
      // 2. Efficient Bulk Insert
      await this.eventRepo.insert(entities);

      // 3. Success Return (MUST include errors: [])
      return {
        success: events.length,
        failed: 0,
        errors: [],
      };
    } catch (error) {
      this.logger.error(`Batch insert failed: ${error.message}`);

      // 4. Failure Return (Map all events to the error structure)
      // Since 'insert' is all-or-nothing, they all failed.
      return {
        success: 0,
        failed: events.length,
        errors: events.map((event) => ({
          event,
          error: error.message,
        })),
      };
    }
  }

  private mapDtoToEntity(dto: RecordEventDto): Partial<AnalyticsEvent> {
    return {
      storeId: dto.storeId,
      productId: dto.productId,
      userId: dto.userId,
      eventType: dto.eventType,
      value: dto.value,
      meta: dto.meta,
      invokedOn: dto.invokedOn ?? (dto.productId ? 'product' : 'store'),
      createdAt: new Date(),
    };
  }
}
