import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AnalyticsQueueService } from './analytics-queue.service';
import { AnalyticsQueueProcessor } from './analytics-queue.processor';

/**
 * AnalyticsQueueModule
 *
 * Standalone module for analytics queue infrastructure.
 * Can be imported independently or as part of QueuesModule.
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'analytics',
    }),
  ],
  providers: [AnalyticsQueueService, AnalyticsQueueProcessor],
  exports: [AnalyticsQueueService],
})
export class AnalyticsQueueModule {}
