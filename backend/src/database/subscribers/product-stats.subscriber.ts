/* eslint-disable prettier/prettier */
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  DataSource,
} from 'typeorm';
import { Review } from 'src/entities/store/review.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

@EventSubscriber()
@Injectable()
export class ProductStatsSubscriber
  implements EntitySubscriberInterface<Review> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Review;
  }

  /**
   * After a review is inserted, update product stats
   */
  async afterInsert(event: InsertEvent<Review>): Promise<void> {
    await this.updateProductStats(event.manager, event.entity.productId);
  }

  /**
   * After a review is updated, update product stats
   */
  async afterUpdate(event: UpdateEvent<Review>): Promise<void> {
    if (event.entity?.productId) {
      await this.updateProductStats(event.manager, event.entity.productId);
    }
  }

  /**
   * After a review is removed, update product stats
   */
  async afterRemove(event: RemoveEvent<Review>): Promise<void> {
    if (event.entity?.productId) {
      await this.updateProductStats(event.manager, event.entity.productId);
    }
  }

  /**
   * Recalculate and update product statistics
   */
  private async updateProductStats(
    manager: any,
    productId: string
  ): Promise<void> {
    const stats = await manager
      .createQueryBuilder(Review, 'review')
      .select('COUNT(*)', 'count')
      .addSelect('ROUND(AVG(review.rating)::NUMERIC, 2)', 'avgRating')
      .where('review.productId = :productId', { productId })
      .getRawOne();

    await manager
      .createQueryBuilder()
      .update(Product)
      .set({
        reviewCount: parseInt(stats.count) || 0,
        averageRating: parseFloat(stats.avgRating) || null,
      })
      .where('id = :productId', { productId })
      .execute();
  }
}
