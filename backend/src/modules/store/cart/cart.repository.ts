import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { PaginationParams } from 'src/common/decorators/pagination.decorator';

/**
 * Cart repository extending BaseRepository<ShoppingCart>.
 *
 * Register this repository as a provider using DataSource factory pattern (see examples elsewhere).
 */
@Injectable()
export class CartRepository extends BaseRepository<ShoppingCart> {
  constructor(dataSource: DataSource) {
    super(ShoppingCart, dataSource.createEntityManager());
  }

  /**
   * Find a cart for a given user + store. Returns null when not found.
   *
   * @param userId - user uuid
   * @param storeId - store uuid
   */
  async findByUserAndStore(
    userId: string,
    storeId: string
  ): Promise<ShoppingCart | null> {
    return this.findOne({
      where: {
        user: { id: userId },
        store: { id: storeId },
      },
      relations: ['user', 'store', 'items', 'items.variant'],
    });
  }

  /**
   * Find all carts that belong to a user, with store relation attached.
   *
   * @param userId - user uuid
   */
  async findAllByUser(
    userId: string,
    pagination?: PaginationParams
  ): Promise<[ShoppingCart[], number]> {
    const { limit = 10, offset = 0 } = pagination || {};
    return this.findAndCount({
      where: { user: { id: userId } },
      relations: ['store', 'items', 'items.variant'],
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Load a cart with items and item.variant relation.
   *
   * @param cartId - cart uuid
   */
  async findWithItems(cartId: string): Promise<ShoppingCart | null> {
    return this.findOne({
      where: { id: cartId },
      relations: ['items', 'items.variant', 'store', 'user'],
    } as any);
  }
}
