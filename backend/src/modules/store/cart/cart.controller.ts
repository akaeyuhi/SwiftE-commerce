import {
  Controller,
  UseGuards,
  Get,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  Body,
  NotFoundException,
  Req,
  ForbiddenException,
  Patch,
} from '@nestjs/common';
import { CartService } from 'src/modules/store/cart/cart.service';
import { CreateCartDto } from 'src/modules/store/cart/dto/create-cart.dto';
import { UpdateCartDto } from 'src/modules/store/cart/dto/update-cart.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { RecordEvent } from 'src/common/decorators/record-event.decorator';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { CartItemDto } from 'src/modules/store/cart/cart-item/dto/cart-item.dto';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import {
  Pagination,
  PaginationParams,
} from 'src/common/decorators/pagination.decorator';
import { PaginatedResponse } from 'src/common/decorators/paginated-response.decorator';

/**
 * CartController
 *
 * Routes for working with a user's cart in a specific store.
 *
 * Path: /stores/:storeId/:userId/cart
 *
 */
@Controller('stores/:storeId/:userId/cart')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard, EntityOwnerGuard)
@UseInterceptors(RecordEventInterceptor)
export class CartController extends BaseController<
  ShoppingCart,
  CreateCartDto,
  UpdateCartDto
> {
  /**
   * Per-route access policy map:
   * - read endpoints: require authentication
   * - mutating endpoints: require store admin (for management), but normal users
   *   can create/get their own cart — your StoreRolesGuard should inspect the
   *   user/store relationship to enforce ownership if desired.
   */
  static accessPolicies: AccessPolicies = {
    findAll: { requireAuthenticated: true },
    findOne: { requireAuthenticated: true },
    create: { requireAuthenticated: true }, // creating one's own cart is fine
    update: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    remove: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },

    getOrCreateCart: { requireAuthenticated: true },
    getUserMergedCarts: { requireAuthenticated: true },
    clearCart: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    removeCart: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
  };

  constructor(private readonly cartService: CartService) {
    super(cartService);
  }

  /**
   * Add an item to the user's cart (create or increment).
   *
   * Body: { cartId, variantId, quantity }
   *
   * @param storeId - UUID of the store
   * @param userId - UUID of the user
   * @param dto - CartItemDto containing cartId, variantId, quantity
   * @returns created or updated CartItem
   */
  @Post('add-item')
  @RecordEvent({
    eventType: AnalyticsEventType.ADD_TO_CART,
    productId: 'body.productId',
    storeId: 'params.storeId',
    userId: 'params.userId',
    value: 'body.quantity',
    when: 'after',
  })
  async addOrIncrement(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: CartItemDto
  ): Promise<CartItem> {
    return this.cartService.addItemToUserCart(userId, storeId, dto);
  }

  /**
   * Get the cart for the user in the specified store.
   *
   * If the cart does not exist, returns 404. Use POST to create or ensure a cart exists.
   *
   * @param storeId - UUID of the store
   * @param userId - UUID of the user
   * @param req
   * @returns the ShoppingCart for the (user, store)
   */
  @Get('user-cart')
  async findOneByUserAndStore(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Req() req: Request
  ): Promise<ShoppingCart | null> {
    const currentUser = (req as any).user;
    if (!currentUser.isAdmin || currentUser.id !== userId) {
      throw new ForbiddenException(`You can't view other people carts`);
    }
    const cart = await this.cartService.getCartByUserAndStore(userId, storeId);
    if (!cart) throw new NotFoundException(`Such cart doesn't exists`);
    return cart;
  }

  /**
   * Create (or return existing) cart for the user in the specified store.
   *
   * Typical client flow: call POST when user visits a store / adds first item.
   *
   * @param storeId - UUID of the store
   * @param userId - UUID of the user
   * @returns the existing or created ShoppingCart
   */
  @Post('get-or-create')
  async getOrCreateCart(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string
  ): Promise<ShoppingCart> {
    return this.cartService.getOrCreateCart(userId, storeId);
  }

  /**
   * Clear all items from the user's cart for the store.
   *
   * @param storeId - UUID of the store
   * @param userId - UUID of the user
   */
  @Delete('clear')
  async clearCart(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string
  ): Promise<{ success: boolean }> {
    const cart = await this.cartService.getCartByUserAndStore(userId, storeId);
    if (!cart) return { success: true };
    await this.cartService.clearCart(cart.id);
    return { success: true };
  }

  /**
   * Delete the user's cart for the store.
   *
   * @param storeId - UUID of the store
   * @param userId - UUID of the user
   */
  @Delete()
  async removeCart(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string
  ): Promise<{ success: boolean }> {
    const cart = await this.cartService.getCartByUserAndStore(userId, storeId);
    if (!cart) return { success: true };
    await this.cartService.remove(cart.id);
    return { success: true };
  }

  /**
   * Return all carts for a user across stores, with store objects attached.
   *
   * Route: GET /stores/:storeId/:userId/cart/merged
   *
   * @param _storeId - store UUID - used for routing convenience
   * @param userId - UUID of the user
   * @param pagination
   * @returns array of ShoppingCart (each includes store relation)
   */
  @Get('merged')
  @PaginatedResponse(ShoppingCart)
  async getUserMergedCarts(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Pagination() pagination: PaginationParams
  ) {
    return this.cartService.getUserMergedCarts(userId, pagination);
  }

  @Patch('sync')
  async syncCartData(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: CreateCartDto
  ) {
    return this.cartService.syncCart(storeId, userId, dto);
  }
}
