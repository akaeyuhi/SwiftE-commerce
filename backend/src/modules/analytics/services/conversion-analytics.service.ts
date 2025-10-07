import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { AnalyticsEventRepository } from '../repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from '../repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from '../repositories/product-daily-stats.repository';
import {
  ProductConversionMetrics,
  StoreConversionMetrics,
  ProductQuickStats,
  StoreQuickStats,
} from '../types';
import { QuickStatsService } from './quick-stats.service';

@Injectable()
export class ConversionAnalyticsService {
  constructor(
    private readonly eventsRepo: AnalyticsEventRepository,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly quickStats: QuickStatsService
  ) {}

  async computeProductConversion(
    productId: string,
    from?: string,
    to?: string
  ): Promise<ProductConversionMetrics> {
    if (!from && !to) {
      const quickStats = await this.quickStats.getProductQuickStats(productId);
      const addToCartData = await this.eventsRepo.aggregateProductMetrics(
        productId,
        { from, to }
      );

      return {
        productId,
        views: quickStats.viewCount,
        purchases: quickStats.totalSales,
        addToCarts: addToCartData.addToCarts || 0,
        revenue: 0,
        conversionRate: quickStats.conversionRate / 100,
        addToCartRate:
          quickStats.viewCount > 0
            ? addToCartData.addToCarts / quickStats.viewCount
            : 0,
        source: 'hybridCached',
      };
    }

    const agg = await this.productStatsRepo.getAggregateRange(
      productId,
      from,
      to
    );

    if (agg.views > 0) {
      return {
        productId,
        views: agg.views,
        purchases: agg.purchases,
        addToCarts: agg.addToCarts,
        revenue: agg.revenue,
        conversionRate: agg.views > 0 ? agg.purchases / agg.views : 0,
        addToCartRate: agg.views > 0 ? agg.addToCarts / agg.views : 0,
        source: 'aggregatedStats',
      };
    }

    const raw = await this.eventsRepo.aggregateProductMetrics(productId, {
      from,
      to,
    });
    return {
      productId,
      views: raw.views,
      purchases: raw.purchases,
      addToCarts: raw.addToCarts,
      revenue: raw.revenue,
      conversionRate: raw.views > 0 ? raw.purchases / raw.views : 0,
      addToCartRate: raw.views > 0 ? raw.addToCarts / raw.views : 0,
      source: 'rawEvents',
    };
  }

  async computeStoreConversion(
    storeId: string,
    from?: string,
    to?: string
  ): Promise<StoreConversionMetrics> {
    if (!from && !to) {
      const quickStats = await this.quickStats.getStoreQuickStats(storeId);
      const eventData = await this.eventsRepo.aggregateStoreMetrics(
        storeId,
        {}
      );

      return {
        storeId,
        views: eventData.views || 0,
        purchases: quickStats.orderCount,
        addToCarts: eventData.addToCarts || 0,
        revenue: quickStats.totalRevenue,
        checkouts: eventData.checkouts || 0,
        conversionRate:
          eventData.views > 0 ? quickStats.orderCount / eventData.views : 0,
        addToCartRate:
          eventData.views > 0 ? eventData.addToCarts / eventData.views : 0,
        checkoutRate:
          eventData.addToCarts > 0
            ? eventData.checkouts / eventData.addToCarts
            : 0,
        source: 'hybridCached',
      };
    }

    const agg = await this.storeStatsRepo.getAggregatedMetrics(storeId, {
      from,
      to,
    });

    if (agg.views > 0) {
      return {
        storeId,
        views: agg.views,
        purchases: agg.purchases,
        addToCarts: agg.addToCarts,
        revenue: agg.revenue,
        checkouts: agg.checkouts,
        conversionRate: agg.views > 0 ? agg.purchases / agg.views : 0,
        addToCartRate: agg.views > 0 ? agg.addToCarts / agg.views : 0,
        checkoutRate: agg.addToCarts > 0 ? agg.checkouts / agg.addToCarts : 0,
        source: 'aggregatedStats',
      };
    }

    const raw = await this.eventsRepo.aggregateStoreMetrics(storeId, {
      from,
      to,
    });
    return {
      storeId,
      views: raw.views,
      purchases: raw.purchases,
      addToCarts: raw.addToCarts,
      revenue: raw.revenue,
      checkouts: raw.checkouts,
      conversionRate: raw.views > 0 ? raw.purchases / raw.views : 0,
      addToCartRate: raw.views > 0 ? raw.addToCarts / raw.views : 0,
      checkoutRate: raw.addToCarts > 0 ? raw.checkouts / raw.addToCarts : 0,
      source: 'rawEvents',
    };
  }

  async getTopProductsByConversion(
    storeId: string,
    from?: string,
    to?: string,
    limit = 10
  ) {
    return this.eventsRepo.getTopProductsByConversion(storeId, {
      from,
      to,
      limit,
    });
  }

  async getTopProductsByConversionCached(
    storeId?: string,
    limit = 10
  ): Promise<ProductQuickStats[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.name',
        'p.viewCount',
        'p.likeCount',
        'p.totalSales',
        'p.reviewCount',
        'p.averageRating',
      ])
      .where('p.deletedAt IS NULL')
      .andWhere('p.viewCount > :minViews', { minViews: 10 })
      .orderBy('(p.totalSales::float / NULLIF(p.viewCount, 0))', 'DESC')
      .limit(limit);

    if (storeId) {
      qb.andWhere('p.storeId = :storeId', { storeId });
    }

    const products = await qb.getMany();

    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      viewCount: p.viewCount || 0,
      likeCount: p.likeCount || 0,
      totalSales: p.totalSales || 0,
      reviewCount: p.reviewCount || 0,
      averageRating: p.averageRating ? Number(p.averageRating) : 0,
      conversionRate:
        p.viewCount > 0
          ? Math.round((p.totalSales / p.viewCount) * 10000) / 100
          : 0,
      source: 'cached',
    }));
  }

  async getTopProductsByViews(
    storeId?: string,
    limit = 10
  ): Promise<ProductQuickStats[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.name',
        'p.viewCount',
        'p.likeCount',
        'p.totalSales',
        'p.reviewCount',
        'p.averageRating',
      ])
      .where('p.deletedAt IS NULL')
      .orderBy('p.viewCount', 'DESC')
      .limit(limit);

    if (storeId) {
      qb.andWhere('p.storeId = :storeId', { storeId });
    }

    const products = await qb.getMany();

    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      viewCount: p.viewCount || 0,
      likeCount: p.likeCount || 0,
      totalSales: p.totalSales || 0,
      reviewCount: p.reviewCount || 0,
      averageRating: p.averageRating ? Number(p.averageRating) : 0,
      conversionRate: p.viewCount > 0 ? (p.totalSales / p.viewCount) * 100 : 0,
      source: 'cached',
    }));
  }

  async getTopStoresByRevenue(limit = 10): Promise<StoreQuickStats[]> {
    const stores = await this.storeRepo.find({
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'orderCount',
        'totalRevenue',
      ],
      order: { totalRevenue: 'DESC' },
      take: limit,
    });

    return stores.map((s) => ({
      storeId: s.id,
      name: s.name,
      productCount: s.productCount || 0,
      followerCount: s.followerCount || 0,
      orderCount: s.orderCount || 0,
      totalRevenue: Number(s.totalRevenue) || 0,
      averageOrderValue:
        s.orderCount > 0
          ? Math.round((Number(s.totalRevenue) / s.orderCount) * 100) / 100
          : 0,
      source: 'cached',
    }));
  }

  async getStoreStats(storeId: string, from?: string, to?: string) {
    const agg = await this.storeStatsRepo.getAggregatedMetrics(storeId, {
      from,
      to,
    });
    const summary = {
      views: agg.views,
      purchases: agg.purchases,
      addToCarts: agg.addToCarts,
      revenue: agg.revenue,
      checkouts: agg.checkouts,
      conversionRate: agg.views > 0 ? agg.purchases / agg.views : 0,
      addToCartRate: agg.views > 0 ? agg.addToCarts / agg.views : 0,
      checkoutRate: agg.addToCarts > 0 ? agg.checkouts / agg.addToCarts : 0,
    };

    let series: any[] = [];
    if (from || to) {
      const where: any = { storeId };
      if (from && to) {
        where.date = Between(from, to);
      } else if (from) {
        where.date = Between(from, new Date().toISOString().slice(0, 10));
      } else if (to) {
        where.date = Between('1970-01-01', to);
      }
      series = await this.storeStatsRepo.find({
        where,
        order: { date: 'ASC' },
      } as any);
    }

    return { storeId, summary, series };
  }

  async getProductStats(productId: string, from?: string, to?: string) {
    const agg = await this.productStatsRepo.getAggregatedMetrics(productId, {
      from,
      to,
    });
    const summary = {
      views: agg.views,
      purchases: agg.purchases,
      addToCarts: agg.addToCarts,
      revenue: agg.revenue,
      conversionRate: agg.views > 0 ? agg.purchases / agg.views : 0,
    };

    let series: any[] = [];
    if (from || to) {
      const where: any = { productId };
      if (from && to) {
        where.date = Between(from, to);
      } else if (from) {
        where.date = Between(from, new Date().toISOString().slice(0, 10));
      } else if (to) {
        where.date = Between('1970-01-01', to);
      }
      series = await this.productStatsRepo.find({
        where,
        order: { date: 'ASC' },
      } as any);
    }

    return { productId, summary, series };
  }
}
