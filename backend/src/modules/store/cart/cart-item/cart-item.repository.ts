import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { PaginationParams } from 'src/common/decorators/pagination.decorator';

/**
 * CartItemRepository
 *
 * Extends BaseRepository<CartItem> and adds cart-specific helpers.
 */
@Injectable()
export class CartItemRepository extends BaseRepository<CartItem> {
  constructor(dataSource: DataSource) {
    super(CartItem, dataSource.createEntityManager());
  }

  /**
   * Find all items for a cart (with variant relation) - paginated.
   *
   * @param cartId - uuid of the shopping cart
   * @param pagination
   */
  async findByCartPaginated(
    cartId: string,
    pagination?: PaginationParams
  ): Promise<[CartItem[], number]> {
    const { limit = 10, offset = 0 } = pagination || {};
    return this.findAndCount({
      where: { cartId },
      relations: ['variant'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Find all items for a cart (with variant relation).
   *
   * @param cartId - uuid of the shopping cart
   */
  async findByCart(cartId: string): Promise<CartItem[]> {
    return this.find({
      where: { cartId },
      relations: ['variant'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Load a cart item with its cart and variant relations.
   *
   * @param itemId - cart item uuid
   */
  async findWithRelations(itemId: string): Promise<CartItem | null> {
    return this.findOne({
      where: { id: itemId },
      relations: ['cart', 'variant'],
    });
  }

  /**
   * Find item by cart + variant (useful to increment existing entry).
   *
   * @param cartId - cart uuid
   * @param variantId - variant uuid
   */
  async findByCartAndVariant(
    cartId: string,
    variantId: string
  ): Promise<CartItem | null> {
    return this.findOne({
      where: { cartId, variantId },
    });
  }
}
