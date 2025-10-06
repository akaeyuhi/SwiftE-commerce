import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class StoreRepository extends BaseRepository<Store> {
  constructor(dataSource: DataSource) {
    super(Store, dataSource.createEntityManager());
  }

  async findStoreByName(name: string): Promise<Store | null> {
    return this.findOne({ where: { name } });
  }

  /**
   * Find top stores by total revenue
   */
  async findTopByRevenue(limit: number): Promise<Store[]> {
    return this.find({
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'totalRevenue',
        'orderCount',
      ],
      order: { totalRevenue: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find top stores by product count
   */
  async findTopByProductCount(limit: number): Promise<Store[]> {
    return this.find({
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'totalRevenue',
        'orderCount',
      ],
      order: { productCount: 'DESC' },
      take: limit,
    });
  }

  /**
   * Manually recalculate all cached statistics for a store
   * Use this for data integrity checks or migrations
   */
  async recalculateStats(storeId: string): Promise<void> {
    await this.manager.query(
      `
      UPDATE stores s
      SET 
        product_count = (
          SELECT COUNT(*) 
          FROM products p 
          WHERE p.store_id = s.id AND p.deleted_at IS NULL
        ),
        follower_count = (
          SELECT COUNT(*) 
          FROM store_followers sf 
          WHERE sf.store_id = s.id
        ),
        order_count = (
          SELECT COUNT(*) 
          FROM orders o 
          WHERE o.store_id = s.id
        ),
        total_revenue = COALESCE((
          SELECT SUM(total_amount) 
          FROM orders o 
          WHERE o.store_id = s.id AND o.status = 'completed'
        ), 0)
      WHERE s.id = $1
    `,
      [storeId]
    );
  }

  /**
   * Recalculate stats for all stores (admin operation)
   */
  async recalculateAllStats(): Promise<void> {
    await this.manager.query(`
      UPDATE stores s
      SET 
        product_count = (
          SELECT COUNT(*) 
          FROM products p 
          WHERE p.store_id = s.id AND p.deleted_at IS NULL
        ),
        follower_count = (
          SELECT COUNT(*) 
          FROM store_followers sf 
          WHERE sf.store_id = s.id
        ),
        order_count = (
          SELECT COUNT(*) 
          FROM orders o 
          WHERE o.store_id = s.id
        ),
        total_revenue = COALESCE((
          SELECT SUM(total_amount) 
          FROM orders o 
          WHERE o.store_id = s.id AND o.status = 'completed'
        ), 0)
    `);
  }
}
