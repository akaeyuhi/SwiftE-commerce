import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { StoreDailyStatsRepository } from '../repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from '../repositories/product-daily-stats.repository';
import { ConversionAnalyticsService } from './conversion-analytics.service';
import {
  StoreQuickStats,
  TopPerformingStores,
} from 'src/modules/analytics/types';

@Injectable()
export class PerformanceAnalyticsService {
  constructor(
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly conversionAnalytics: ConversionAnalyticsService
  ) {}

  async getTopPerformingStores(
    limit: number,
    from?: string,
    to?: string
  ): Promise<TopPerformingStores | StoreQuickStats[]> {
    if (!from && !to) {
      return this.conversionAnalytics.getTopStoresByRevenue(limit);
    }

    const storeStats = await this.storeStatsRepo.getTopStoreDaily(
      from!,
      to!,
      limit
    );

    const storeIds = storeStats.map((s) => s.storeId);
    const stores = await this.storeRepo.find({
      where: storeIds.map((id) => ({ id })),
      select: ['id', 'name'],
    });

    const storeMap = new Map(stores.map((s) => [s.id, s.name]));

    return {
      dateRange: { from, to },
      stores: storeStats.map((stat, index) => ({
        rank: index + 1,
        storeId: stat.storeId,
        storeName: storeMap.get(stat.storeId) || 'Unknown',
        views: parseInt(stat.totalViews) || 0,
        purchases: parseInt(stat.totalPurchases) || 0,
        revenue: parseFloat(stat.totalRevenue) || 0,
        addToCarts: parseInt(stat.totalAddToCarts) || 0,
        conversionRate:
          stat.totalViews > 0
            ? Math.round((stat.totalPurchases / stat.totalViews) * 10000) / 100
            : 0,
        averageOrderValue:
          stat.totalPurchases > 0
            ? Math.round((stat.totalRevenue / stat.totalPurchases) * 100) / 100
            : 0,
      })),
    };
  }

  async getTopPerformingProducts(
    storeId?: string,
    limit = 10,
    from?: string,
    to?: string
  ) {
    return this.conversionAnalytics.getTopProductsByConversion(
      storeId!,
      from,
      to,
      limit
    );
  }

  async getUnderperformingAnalysis(
    storeId?: string,
    from?: string,
    to?: string
  ) {
    let items: any[];
    let type: 'product' | 'store';

    if (storeId) {
      type = 'product';
      items = await this.productStatsRepo.getUnderperformingProducts(
        storeId,
        from,
        to
      );
    } else {
      type = 'store';
      items = await this.storeStatsRepo.getUnderperformingStores(from, to);
    }

    const validItems = items.filter((i) => parseInt(i.views) > 10);

    if (validItems.length === 0) {
      return {
        type,
        storeId,
        dateRange: { from, to },
        message: 'Not enough data to perform analysis',
        underperforming: [] as any[],
      };
    }

    const sortedByConversion = [...validItems]
      .map((i) => ({
        ...i,
        conversionRate:
          parseInt(i.views) > 0 ? parseInt(i.purchases) / parseInt(i.views) : 0,
      }))
      .sort((a, b) => a.conversionRate - b.conversionRate);

    const medianConversion =
      sortedByConversion[Math.floor(sortedByConversion.length / 2)]
        .conversionRate;

    const sortedByRevenue = [...validItems]
      .map((i) => ({ ...i, revenue: parseFloat(i.revenue) }))
      .sort((a, b) => a.revenue - b.revenue);

    const medianRevenue =
      sortedByRevenue[Math.floor(sortedByRevenue.length / 2)].revenue;

    const underperforming = validItems
      .map((item) => {
        const views = parseInt(item.views);
        const purchases = parseInt(item.purchases);
        const revenue = parseFloat(item.revenue);
        const conversionRate = views > 0 ? purchases / views : 0;

        const conversionGap =
          ((medianConversion - conversionRate) / medianConversion) * 100;
        const revenueGap = ((medianRevenue - revenue) / medianRevenue) * 100;

        return {
          id: item.id,
          name: item.name,
          views,
          purchases,
          revenue,
          conversionRate: Math.round(conversionRate * 10000) / 100,
          conversionGap: Math.round(conversionGap),
          revenueGap: Math.round(revenueGap),
          overallScore: Math.round((conversionGap + revenueGap) / 2),
        };
      })
      .filter((item) => item.conversionGap > 50 && item.revenueGap > 50)
      .sort((a, b) => b.overallScore - a.overallScore);

    const recommendations = underperforming.slice(0, 10).map((item) => {
      const issues: string[] = [];
      const actions: string[] = [];

      if (item.views < 100) {
        issues.push('Low visibility');
        actions.push('Improve SEO, add better images, update description');
      }
      if (item.conversionRate < 1) {
        issues.push('Poor conversion');
        actions.push('Review pricing, add reviews, improve product details');
      }
      if (item.revenue < medianRevenue * 0.3) {
        issues.push('Low revenue');
        actions.push('Consider promotions, bundle deals, or price adjustment');
      }

      return { ...item, issues, recommendedActions: actions };
    });

    return {
      type,
      storeId,
      dateRange: { from, to },
      benchmarks: {
        medianConversionRate: Math.round(medianConversion * 10000) / 100,
        medianRevenue: Math.round(medianRevenue * 100) / 100,
        totalAnalyzed: validItems.length,
      },
      underperforming: recommendations,
    };
  }
}
