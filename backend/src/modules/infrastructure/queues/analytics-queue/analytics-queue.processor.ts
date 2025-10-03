import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  AnalyticsJobData,
  AnalyticsJobPayload,
  AnalyticsJobType,
} from './types/analytics-queue.types';

/**
 * AnalyticsQueueProcessor
 *
 * Handles actual job processing with lazy-loaded dependencies.
 * Uses ModuleRef to dynamically load repositories only when needed.
 *
 */
@Injectable()
@Processor('analytics')
export class AnalyticsQueueProcessor {
  private readonly logger = new Logger(AnalyticsQueueProcessor.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  @Process(AnalyticsJobType.RECORD_SINGLE)
  async handleRecordSingle(job: Job<AnalyticsJobData>) {
    try {
      const { events } = job.data;
      if (!events?.length) {
        throw new Error('No events to process');
      }

      // Lazy load repository
      const eventsRepo = await this.getAnalyticsEventRepository();

      const entities = events.map((event) =>
        eventsRepo.create({
          storeId: event.storeId,
          productId: event.productId,
          userId: event.userId,
          eventType: event.eventType,
          value: event.value,
          meta: event.meta,
          invokedOn: event.invokedOn || (event.productId ? 'product' : 'store'),
        })
      );

      await eventsRepo.save(entities);

      this.logger.debug(
        `Job ${job.id}: Processed ${entities.length} analytics events`
      );

      return {
        success: true,
        processed: entities.length,
        jobId: job.id,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  }

  @Process(AnalyticsJobType.RECORD_BATCH)
  async handleRecordBatch(job: Job<AnalyticsJobData>) {
    try {
      const { events, batchId } = job.data;
      if (!events?.length) {
        throw new Error('No events in batch to process');
      }

      await job.progress(25);

      const eventsRepo = await this.getAnalyticsEventRepository();

      const entities = events.map((event) =>
        eventsRepo.create({
          storeId: event.storeId,
          productId: event.productId,
          userId: event.userId,
          eventType: event.eventType,
          value: event.value,
          meta: event.meta,
          invokedOn: event.invokedOn || (event.productId ? 'product' : 'store'),
        })
      );

      await job.progress(75);
      await eventsRepo.save(entities);
      await job.progress(100);

      this.logger.debug(
        `Job ${job.id}: Processed batch ${batchId} with ${entities.length} events`
      );

      return {
        success: true,
        batchId,
        processed: entities.length,
        jobId: job.id,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Batch job ${job.id} failed:`, error);
      throw error;
    }
  }

  @Process(AnalyticsJobType.AGGREGATE_DAILY)
  async handleAggregateDaily(job: Job<AnalyticsJobData>) {
    try {
      const aggregationDate = job.data.metadata?.aggregationDate
        ? new Date(job.data.metadata.aggregationDate)
        : new Date();

      aggregationDate.setHours(0, 0, 0, 0);
      const dateStr = aggregationDate.toISOString().split('T')[0];

      this.logger.debug(
        `Job ${job.id}: Processing daily aggregation for ${dateStr}`
      );

      await job.progress(10);

      // Get repositories
      const eventsRepo = await this.getAnalyticsEventRepository();
      const storeStatsRepo = await this.getStoreStatsRepository();
      const productStatsRepo = await this.getProductStatsRepository();

      await job.progress(20);

      // Aggregate store metrics for the day
      const storeMetrics = await eventsRepo
        .createQueryBuilder('event')
        .select('event.storeId', 'storeId')
        .addSelect(
          'COUNT(CASE WHEN event.eventType = :view THEN 1 END)',
          'views'
        )
        .addSelect(
          'COUNT(CASE WHEN event.eventType = :like THEN 1 END)',
          'likes'
        )
        .addSelect(
          'COUNT(CASE WHEN event.eventType = :cart THEN 1 END)',
          'addToCarts'
        )
        .addSelect(
          'COUNT(CASE WHEN event.eventType = :purchase THEN 1 END)',
          'purchases'
        )
        .addSelect(
          'SUM(CASE WHEN event.eventType = :purchase THEN event.value ELSE 0 END)',
          'revenue'
        )
        .where('DATE(event.createdAt) = :date', { date: dateStr })
        .andWhere('event.storeId IS NOT NULL')
        .groupBy('event.storeId')
        .setParameters({
          view: 'view',
          like: 'like',
          cart: 'add_to_cart',
          purchase: 'purchase',
        })
        .getRawMany();

      await job.progress(50);

      // Save store stats
      for (const metric of storeMetrics) {
        await storeStatsRepo.save({
          storeId: metric.storeId,
          date: dateStr,
          views: parseInt(metric.views) || 0,
          likes: parseInt(metric.likes) || 0,
          addToCarts: parseInt(metric.addToCarts) || 0,
          purchases: parseInt(metric.purchases) || 0,
          revenue: parseFloat(metric.revenue) || 0,
          conversionRate:
            metric.views > 0 ? metric.purchases / metric.views : 0,
        });
      }

      await job.progress(70);

      // Aggregate product metrics for the day
      const productMetrics = await eventsRepo
        .createQueryBuilder('event')
        .select('event.productId', 'productId')
        .addSelect(
          'COUNT(CASE WHEN event.eventType = :view THEN 1 END)',
          'views'
        )
        .addSelect(
          'COUNT(CASE WHEN event.eventType = :like THEN 1 END)',
          'likes'
        )
        .addSelect(
          'COUNT(CASE WHEN event.eventType = :cart THEN 1 END)',
          'addToCarts'
        )
        .addSelect(
          'COUNT(CASE WHEN event.eventType = :purchase THEN 1 END)',
          'purchases'
        )
        .addSelect(
          'SUM(CASE WHEN event.eventType = :purchase THEN event.value ELSE 0 END)',
          'revenue'
        )
        .where('DATE(event.createdAt) = :date', { date: dateStr })
        .andWhere('event.productId IS NOT NULL')
        .groupBy('event.productId')
        .setParameters({
          view: 'view',
          like: 'like',
          cart: 'add_to_cart',
          purchase: 'purchase',
        })
        .getRawMany();

      await job.progress(90);

      // Save product stats
      for (const metric of productMetrics) {
        await productStatsRepo.save({
          productId: metric.productId,
          date: dateStr,
          views: parseInt(metric.views) || 0,
          likes: parseInt(metric.likes) || 0,
          addToCarts: parseInt(metric.addToCarts) || 0,
          purchases: parseInt(metric.purchases) || 0,
          revenue: parseFloat(metric.revenue) || 0,
          conversionRate:
            metric.views > 0 ? metric.purchases / metric.views : 0,
        });
      }

      await job.progress(100);

      this.logger.log(
        `Aggregation completed for ${dateStr}: ${storeMetrics.length} stores, ${productMetrics.length} products`
      );

      return {
        success: true,
        date: dateStr,
        type: 'daily_aggregation',
        storesAggregated: storeMetrics.length,
        productsAggregated: productMetrics.length,
        jobId: job.id,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Aggregation job ${job.id} failed:`, error);
      throw error;
    }
  }

  @Process(AnalyticsJobType.CLEANUP_OLD)
  async handleCleanupOld(job: Job<AnalyticsJobData>) {
    try {
      const daysToKeep = job.data.metadata?.daysToKeep || 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      this.logger.debug(
        `Job ${job.id}: Cleaning up events older than ${cutoffDate.toISOString()}`
      );

      await job.progress(50);

      const eventsRepo = await this.getAnalyticsEventRepository();

      const result = await eventsRepo
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      await job.progress(100);

      this.logger.log(
        `Cleanup completed: deleted ${result.affected || 0} old events`
      );

      return {
        success: true,
        cutoffDate: cutoffDate.toISOString(),
        deleted: result.affected || 0,
        type: 'cleanup',
        daysToKeep,
        jobId: job.id,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Cleanup job ${job.id} failed:`, error);
      throw error;
    }
  }

  @Process(AnalyticsJobType.PROCESS_METRICS)
  async handleProcessMetrics(job: Job<AnalyticsJobData>) {
    try {
      this.logger.debug(`Job ${job.id}: Processing metrics`);

      await job.progress(50);

      // Placeholder for metrics processing
      // You can implement specific metrics calculations here
      // For now, just log that it ran
      this.logger.log('Metrics processing placeholder - implement as needed');

      await job.progress(100);

      return {
        success: true,
        type: 'metrics_processing',
        jobId: job.id,
        processedAt: new Date().toISOString(),
        note: 'Metrics processing not fully implemented',
      };
    } catch (error) {
      this.logger.error(`Metrics job ${job.id} failed:`, error);
      throw error;
    }
  }

  @Process(AnalyticsJobType.GENERATE_REPORT)
  async handleGenerateReport(job: Job<AnalyticsJobData>) {
    try {
      this.logger.debug(`Job ${job.id}: Generating analytics report`);

      await job.progress(25);

      const { reportType } = job.data.metadata || {};

      // Placeholder for report generation
      // You can implement specific report types here
      this.logger.log(
        `Report generation placeholder for type: ${reportType || 'default'}`
      );

      await job.progress(100);

      return {
        success: true,
        type: 'report_generation',
        reportType: reportType || 'default',
        jobId: job.id,
        processedAt: new Date().toISOString(),
        note: 'Report generation not fully implemented',
      };
    } catch (error) {
      this.logger.error(`Report job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Legacy processor for backward compatibility
   */
  @Process('record')
  async handleLegacyRecord(job: Job<AnalyticsJobPayload>) {
    try {
      const payload = job.data;
      const events = Array.isArray(payload) ? payload : [payload];

      const eventsRepo = await this.getAnalyticsEventRepository();

      const entities = events.map((event) =>
        eventsRepo.create({
          storeId: event.storeId,
          productId: event.productId,
          userId: event.userId,
          eventType: event.eventType,
          value: event.value,
          meta: event.meta,
          invokedOn: event.invokedOn || (event.productId ? 'product' : 'store'),
        })
      );

      await eventsRepo.save(entities);

      this.logger.debug(
        `Legacy record job ${job.id}: Processed ${entities.length} events`
      );

      return {
        success: true,
        processed: entities.length,
        jobId: job.id,
      };
    } catch (error) {
      this.logger.error(`Legacy record job ${job.id} failed:`, error);
      throw error;
    }
  }

  // ===============================
  // Lazy Loading Helpers
  // ===============================

  private async getAnalyticsEventRepository() {
    try {
      const { AnalyticsEventRepository } = await import(
        'src/modules/analytics/repositories/analytics-event.repository'
      );
      return this.moduleRef.get(AnalyticsEventRepository, { strict: false });
    } catch (error) {
      this.logger.error('Failed to load AnalyticsEventRepository:', error);
      throw new Error(
        'AnalyticsEventRepository not available. Make sure AnalyticsModule is loaded.'
      );
    }
  }

  private async getStoreStatsRepository() {
    try {
      const { StoreDailyStatsRepository } = await import(
        'src/modules/analytics/repositories/store-daily-stats.repository'
      );
      return this.moduleRef.get(StoreDailyStatsRepository, { strict: false });
    } catch (error) {
      this.logger.error('Failed to load StoreDailyStatsRepository:', error);
      throw new Error('StoreDailyStatsRepository not available');
    }
  }

  private async getProductStatsRepository() {
    try {
      const { ProductDailyStatsRepository } = await import(
        'src/modules/analytics/repositories/product-daily-stats.repository'
      );
      return this.moduleRef.get(ProductDailyStatsRepository, { strict: false });
    } catch (error) {
      this.logger.error('Failed to load ProductDailyStatsRepository:', error);
      throw new Error('ProductDailyStatsRepository not available');
    }
  }

  /**
   * Optionally get AnalyticsService for advanced operations
   */
  private async getAnalyticsService() {
    try {
      const { AnalyticsService } = await import(
        'src/modules/analytics/analytics.service'
      );
      return this.moduleRef.get(AnalyticsService, { strict: false });
    } catch (error) {
      this.logger.warn('AnalyticsService not available:', error);
      return null;
    }
  }
}
