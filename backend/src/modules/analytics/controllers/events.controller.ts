import { Controller, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { AnalyticsService } from 'src/modules/analytics/analytics.service';
import { RecordEventDto } from 'src/modules/analytics/dto/record-event.dto';

/**
 * EventsController
 *
 * Lightweight public API for recording analytics events.
 * Path: POST /stores/:storeId/analytics/events
 */
@Controller('stores/:storeId/analytics/events')
export class EventsController {
  constructor(private readonly statsService: AnalyticsService) {}

  @Post()
  async recordEvent(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: RecordEventDto
  ) {
    // Ensure storeId from route if not present in DTO
    dto.storeId = dto.storeId ?? storeId;
    return this.statsService.recordEvent(dto);
  }
}
