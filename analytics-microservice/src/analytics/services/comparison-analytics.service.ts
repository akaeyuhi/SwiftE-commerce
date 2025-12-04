import { Injectable } from '@nestjs/common';
import { ConversionAnalyticsService } from './conversion-analytics.service';

@Injectable()
export class ComparisonAnalyticsService {
  constructor(
    private readonly conversionAnalytics: ConversionAnalyticsService
  ) {}

  async getStoreComparison(storeIds: string[], from?: string, to?: string) {
    const comparisons = await Promise.all(
      storeIds.map((storeId) =>
        this.conversionAnalytics.computeStoreConversion(storeId, from, to)
      )
    );
    return { stores: comparisons };
  }

  async getProductComparison(productIds: string[], from?: string, to?: string) {
    const comparisons = await Promise.all(
      productIds.map((productId) =>
        this.conversionAnalytics.computeProductConversion(productId, from, to)
      )
    );
    return { products: comparisons };
  }

  async getPeriodComparison(
    storeId?: string,
    productId?: string,
    from?: string,
    to?: string
  ) {
    if (!from || !to) {
      throw new Error(
        'Both from and to dates are required for period comparison'
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const periodLength = toDate.getTime() - fromDate.getTime();

    const prevToDate = new Date(fromDate.getTime() - 1);
    const prevFromDate = new Date(prevToDate.getTime() - periodLength);

    const prevFrom = prevFromDate.toISOString().slice(0, 10);
    const prevTo = prevToDate.toISOString().slice(0, 10);

    let currentMetrics: any;
    let previousMetrics: any;

    if (productId) {
      [currentMetrics, previousMetrics] = await Promise.all([
        this.conversionAnalytics.computeProductConversion(productId, from, to),
        this.conversionAnalytics.computeProductConversion(
          productId,
          prevFrom,
          prevTo
        ),
      ]);
    } else if (storeId) {
      [currentMetrics, previousMetrics] = await Promise.all([
        this.conversionAnalytics.computeStoreConversion(storeId, from, to),
        this.conversionAnalytics.computeStoreConversion(
          storeId,
          prevFrom,
          prevTo
        ),
      ]);
    } else {
      throw new Error('Either storeId or productId is required');
    }

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const changes = {
      views: calculateChange(currentMetrics.views, previousMetrics.views),
      purchases: calculateChange(
        currentMetrics.purchases,
        previousMetrics.purchases
      ),
      addToCarts: calculateChange(
        currentMetrics.addToCarts,
        previousMetrics.addToCarts
      ),
      revenue: calculateChange(
        currentMetrics.revenue || 0,
        previousMetrics.revenue || 0
      ),
      conversionRate: calculateChange(
        currentMetrics.conversionRate,
        previousMetrics.conversionRate
      ),
    };

    return {
      storeId,
      productId,
      currentPeriod: { from, to, metrics: currentMetrics },
      previousPeriod: { from: prevFrom, to: prevTo, metrics: previousMetrics },
      changes,
      trend:
        changes.revenue > 0 ? 'up' : changes.revenue < 0 ? 'down' : 'stable',
    };
  }
}
