import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { CartItemRepository } from 'src/modules/store/cart/cart-item/cart-item.repository';
import { CartItemDto } from 'src/modules/store/cart/cart-item/dto/cart-item.dto';
import { AnalyticsQueueService } from 'src/modules/analytics/queues/analytics-queue.service';

/**
 * CartItemService
 *
 * Provides CRUD methods and convenience helpers for cart items:
 *  - createWithCartAndVariant: create an item linked to cart & variant
 *  - addOrIncrement: increments existing item quantity or creates new
 *  - updateQuantity: set absolute quantity (0 => delete)
 *  - increment/decrement helpers
 *  - remove: delete item
 *  - findByCart: list items
 *
 * This service intentionally keeps variant existence checks optional — inject your
 * VariantsRepository if you want pre-validation before creation.
 */
@Injectable()
export class CartItemService extends BaseService<
  CartItem,
  CartItemDto,
  CartItemDto,
  CartItemDto
> {
  private readonly logger = new Logger(CartItemService.name);
  constructor(
    private readonly itemRepo: CartItemRepository,
    private readonly analyticsQueue: AnalyticsQueueService
  ) {
    super(itemRepo);
  }

  /**
   * Create a CartItem wiring cart and variant relations.
   *
   * @param dto - CreateCartItemDto with cartId, variantId, quantity
   * @returns created CartItem entity
   */
  async createWithCartAndVariant(dto: CartItemDto): Promise<CartItem> {
    if (!dto.cartId) throw new BadRequestException('cartId required');
    if (!dto.variantId) throw new BadRequestException('variantId required');
    if (!dto.quantity || dto.quantity < 1)
      throw new BadRequestException('quantity must be >= 1');

    const partial: any = {
      cart: { id: dto.cartId },
      variant: { id: dto.variantId },
      quantity: dto.quantity,
    };

    return await this.repository.createEntity(partial);
  }

  /**
   * Add or increment an item in a cart:
   *  - If an item for (cartId, variantId) exists, increment quantity by `quantity`.
   *  - Otherwise create a new item.
   *
   *  @param storeId - Store id
   *  @param userId - user id
   *  @param dto - dto to add to cart
   */
  async addOrIncrement(
    storeId: string,
    userId: string,
    dto: CartItemDto
  ): Promise<CartItem> {
    const { cartId, variantId, productId, quantity } = dto;
    if (dto.quantity <= 0)
      throw new BadRequestException('Quantity must be > 0');

    const existing = await this.itemRepo.findByCartAndVariant(
      dto.cartId,
      dto.variantId
    );
    const itemRepo = this.itemRepo.manager.getRepository(CartItem);

    if (existing) {
      existing.quantity = (existing.quantity ?? 0) + quantity;
      return itemRepo.save(existing);
    }

    const created = itemRepo.create({
      cart: { id: cartId },
      variant: { id: variantId },
      quantity,
    });

    try {
      await this.analyticsQueue.recordAddToCart(
        storeId,
        productId ?? '',
        userId,
        quantity,
        { cartId: created.cart.id }
      );
    } catch (err) {
      // do not fail the API if analytics fails; just log
      this.logger.warn(
        'Failed to enqueue addToCart event: ' + (err as any)?.message
      );
    }

    return itemRepo.save(created);
  }

  /**
   * Update absolute quantity of an item. If quantity === 0 then item is removed.
   *
   * @param itemId - uuid of cart item
   * @param quantity - new quantity (>= 0)
   * @returns updated CartItem (or the removed item with quantity set to 0)
   */
  async updateQuantity(itemId: string, quantity: number): Promise<CartItem> {
    if (quantity < 0)
      throw new BadRequestException('Quantity cannot be negative');

    const item = await this.itemRepo.findWithRelations(itemId);
    if (!item) throw new NotFoundException('Cart item not found');

    const itemRepo = this.itemRepo.manager.getRepository(CartItem);

    if (quantity === 0) {
      await itemRepo.delete(itemId);
      item.quantity = 0;
      return item;
    }

    item.quantity = quantity;
    return itemRepo.save(item);
  }

  /**
   * Increment item quantity by delta (delta may be negative for decrement).
   *
   * Throws when resulting quantity would be negative.
   *
   * @param itemId - uuid of cart item
   * @param delta - integer delta (positive or negative)
   */
  async adjustQuantity(itemId: string, delta: number): Promise<CartItem> {
    if (!delta || delta === 0)
      throw new BadRequestException('delta must be non-zero');

    const item = await this.itemRepo.findWithRelations(itemId);
    if (!item) throw new NotFoundException('Cart item not found');

    const newQty = (item.quantity ?? 0) + delta;
    if (newQty < 0)
      throw new BadRequestException('Resulting quantity would be negative');

    item.quantity = newQty;
    return this.itemRepo.manager.getRepository(CartItem).save(item);
  }

  /**
   * List items for a cart.
   *
   * @param cartId - uuid of the cart
   * @returns array of CartItem entities with variant relation
   */
  async findByCart(cartId: string): Promise<CartItem[]> {
    return this.itemRepo.findByCart(cartId);
  }
}
