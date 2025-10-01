import {
  Controller,
  UseGuards,
  Post,
  Put,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import { CartItemDto } from 'src/modules/store/cart/cart-item/dto/cart-item.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { RecordEvent } from 'src/common/decorators/record-event.decorator';

/**
 * CartItemController
 *
 * Routes to manage items inside a user's cart.
 *
 * Path: /stores/:storeId/:userId/cart/items
 */
@Controller('stores/:storeId/:userId/cart/:cartId/items')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class CartItemController extends BaseController<
  CartItem,
  CartItemDto,
  CartItemDto,
  CartItemDto
> {
  static accessPolicies: AccessPolicies = {
    findAll: { requireAuthenticated: true },
    findOne: { requireAuthenticated: true },
    create: { requireAuthenticated: true },
    update: { requireAuthenticated: true },
    remove: { requireAuthenticated: true },

    addOrIncrement: { requireAuthenticated: true },
    updateQuantity: { requireAuthenticated: true },
    listForCart: { requireAuthenticated: true },
  };

  constructor(private readonly cartItemService: CartItemService) {
    super(cartItemService);
  }

  /**
   * Add an item to the user's cart (create or increment).
   *
   * Body: { cartId, variantId, quantity }
   *
   * @param _storeId - UUID of the store
   * @param _userId - UUID of the user
   * @param dto - CartItemDto containing cartId, variantId, quantity
   * @returns created or updated CartItem
   */
  @Post('add')
  @RecordEvent({
    eventType: AnalyticsEventType.ADD_TO_CART,
    productId: 'body.productId',
    storeId: 'params.storeId',
    userId: 'params.userId',
    value: 'body.quantity',
    when: 'after',
  })
  async addOrIncrement(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('userId', new ParseUUIDPipe()) _userId: string,
    @Body() dto: CartItemDto
  ): Promise<CartItem> {
    return this.cartItemService.addOrIncrement(dto);
  }

  /**
   * Update cart item quantity (set absolute).
   *
   * @param _storeId - UUID of the store
   * @param _userId - UUID of the user
   * @param itemId - UUID of the cart item to update
   * @param dto - UpdateCartItemDto { quantity }
   * @returns updated CartItem (or removed representation quantity=0)
   */
  @Put(':itemId')
  async updateQuantity(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('userId', new ParseUUIDPipe()) _userId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: CartItemDto
  ): Promise<CartItem> {
    return this.cartItemService.updateQuantity(itemId, dto.quantity ?? 0);
  }
}
