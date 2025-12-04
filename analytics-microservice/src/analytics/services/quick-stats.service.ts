import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductQuickStats, StoreQuickStats } from '../types';
import { Product } from 'entities/read-only/product.entity';
import { Store } from 'entities/read-only/store.entity';

@Injectable()
export class QuickStatsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>
  ) {}

  async getProductQuickStats(productId: string): Promise<ProductQuickStats> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: [
        'id',
        'name',
        'averageRating',
        'reviewCount',
        'likeCount',
        'viewCount',
        'totalSales',
      ],
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const conversionRate =
      product.viewCount > 0
        ? (product.totalSales / product.viewCount) * 100
        : 0;

    return {
      productId: product.id,
      name: product.name,
      viewCount: product.viewCount || 0,
      likeCount: product.likeCount || 0,
      totalSales: product.totalSales || 0,
      reviewCount: product.reviewCount || 0,
      averageRating: product.averageRating ? Number(product.averageRating) : 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      source: 'cached',
    };
  }

  async getStoreQuickStats(storeId: string): Promise<StoreQuickStats> {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'conversionRate',
        'orderCount',
        'totalRevenue',
      ],
    });

    if (!store) {
      throw new Error('Store not found');
    }

    const averageOrderValue =
      store.orderCount > 0 ? Number(store.totalRevenue) / store.orderCount : 0;

    return {
      storeId: store.id,
      name: store.name,
      productCount: store.productCount || 0,
      followerCount: store.followerCount || 0,
      orderCount: store.orderCount || 0,
      totalRevenue: Number(store.totalRevenue) || 0,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      source: 'cached',
    };
  }

  async getBatchProductStats(
    productIds: string[]
  ): Promise<ProductQuickStats[]> {
    const products = await this.productRepo.find({
      where: { id: In(productIds) },
      select: [
        'id',
        'name',
        'averageRating',
        'reviewCount',
        'likeCount',
        'viewCount',
        'totalSales',
      ],
    });

    return products.map((product) => {
      const conversionRate =
        product.viewCount > 0
          ? (product.totalSales / product.viewCount) * 100
          : 0;

      return {
        productId: product.id,
        name: product.name,
        viewCount: product.viewCount || 0,
        likeCount: product.likeCount || 0,
        totalSales: product.totalSales || 0,
        reviewCount: product.reviewCount || 0,
        averageRating: product.averageRating
          ? Number(product.averageRating)
          : 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
        source: 'cached',
      };
    });
  }
}
