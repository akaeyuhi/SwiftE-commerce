import { Injectable } from '@nestjs/common';
import { AnalyticsEventRepository } from '../repositories/analytics-event.repository';
import { FunnelAnalysisResult } from '../types';

@Injectable()
export class FunnelAnalyticsService {
  constructor(private readonly eventsRepo: AnalyticsEventRepository) {}

  async getFunnelAnalysis(
    storeId?: string,
    productId?: string,
    from?: string,
    to?: string
  ): Promise<FunnelAnalysisResult> {
    const [views, addToCarts, purchases] = await this.eventsRepo.getFunnelData(
      storeId,
      productId,
      from,
      to
    );

    return {
      funnel: { views, addToCarts, purchases },
      rates: {
        viewToCart:
          views > 0 ? ((addToCarts / views) * 100).toFixed(2) : '0.00',
        cartToPurchase:
          addToCarts > 0 ? ((purchases / addToCarts) * 100).toFixed(2) : '0.00',
        overallConversion:
          views > 0 ? ((purchases / views) * 100).toFixed(2) : '0.00',
      },
    };
  }

  async getUserJourneyAnalysis(storeId?: string, from?: string, to?: string) {
    const events = await this.eventsRepo.getEventsForUserJourney(
      storeId,
      from,
      to
    );

    // Group events by user
    const userJourneys = new Map<string, any[]>();
    for (const event of events) {
      if (!userJourneys.has(event.userId)) {
        userJourneys.set(event.userId, []);
      }
      userJourneys.get(event.userId)!.push(event);
    }

    // Analyze common paths
    const pathCounts = new Map<string, number>();
    const dropOffPoints = new Map<string, number>();

    for (const [, journey] of userJourneys.entries()) {
      const path = journey
        .slice(0, 5)
        .map((e) => e.eventType)
        .join(' → ');

      pathCounts.set(path, (pathCounts.get(path) || 0) + 1);

      const lastEvent = journey[journey.length - 1];
      if (lastEvent.eventType !== 'purchase') {
        dropOffPoints.set(
          lastEvent.eventType,
          (dropOffPoints.get(lastEvent.eventType) || 0) + 1
        );
      }
    }

    const commonPaths = Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({
        path,
        userCount: count,
        percentage: Math.round((count / userJourneys.size) * 100),
      }));

    const dropOffs = Array.from(dropOffPoints.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([stage, count]) => ({
        stage,
        dropOffCount: count,
        percentage: Math.round((count / userJourneys.size) * 100),
      }));

    const totalEvents = Array.from(userJourneys.values()).reduce(
      (sum, journey) => sum + journey.length,
      0
    );
    const avgJourneyLength =
      userJourneys.size > 0
        ? Math.round((totalEvents / userJourneys.size) * 10) / 10
        : 0;

    const convertedUsers = Array.from(userJourneys.values()).filter((journey) =>
      journey.some((e) => e.eventType === 'purchase')
    ).length;

    return {
      storeId,
      dateRange: { from, to },
      summary: {
        totalUsers: userJourneys.size,
        averageJourneyLength: avgJourneyLength,
        convertedUsers,
        conversionRate:
          userJourneys.size > 0
            ? Math.round((convertedUsers / userJourneys.size) * 100)
            : 0,
      },
      commonPaths,
      dropOffPoints: dropOffs,
    };
  }

  async getCohortAnalysis(storeId: string, from?: string, to?: string) {
    return {
      message: 'Cohort analysis - requires user cohort tracking implementation',
      storeId,
      dateRange: { from, to },
    };
  }

  async getRevenueTrends(storeId?: string, from?: string, to?: string) {
    return this.eventsRepo.getRevenueTrends(storeId, from, to);
  }
}
