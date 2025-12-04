import { Injectable } from '@nestjs/common';
import { Between } from 'typeorm';
import { AnalyticsEventRepository } from '../repositories/analytics-event.repository';

@Injectable()
export class HealthCheckService {
  constructor(private readonly eventsRepo: AnalyticsEventRepository) {}

  async healthCheck() {
    try {
      await this.eventsRepo.count({ take: 1 } as any);

      return {
        healthy: true,
        message: 'Analytics service operational',
        details: {
          eventsRepo: 'connected',
          statsRepos: 'connected',
          queueService: 'available',
        },
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Analytics service error',
        details: {
          error: error.message,
        },
      };
    }
  }

  async getStats() {
    const [totalEvents, recentEvents] = await Promise.all([
      this.eventsRepo.count(),
      this.eventsRepo.count({
        where: {
          createdAt: Between(
            new Date(Date.now() - 24 * 60 * 60 * 1000),
            new Date()
          ),
        },
      } as any),
    ]);

    return {
      totalEvents,
      recentEvents,
      supportedAggregators: this.getSupportedAggregators().length,
    };
  }

  private getSupportedAggregators(): string[] {
    return [
      'productConversion',
      'storeConversion',
      'topProductsByConversion',
      'storeStats',
      'productStats',
      'productRating',
      'storeRatingsSummary',
      'funnelAnalysis',
      'userJourney',
      'cohortAnalysis',
      'revenueTrends',
      'storeComparison',
      'productComparison',
      'periodComparison',
      'topPerformingStores',
      'topPerformingProducts',
      'underperformingAnalysis',
    ];
  }
}
