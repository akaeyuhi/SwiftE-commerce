import {
  Controller,
  UseGuards,
  Put,
  Param,
  Body,
  ParseUUIDPipe,
  Get,
} from '@nestjs/common';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import {
  CartItemDto,
  UpdateCartItemQuantityDto,
} from 'src/modules/store/cart/cart-item/dto/cart-item.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import {
  Pagination,
  PaginationParams,
} from 'src/common/decorators/pagination.decorator';
import { PaginatedResponse } from 'src/common/decorators/paginated-response.decorator';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';

/**
 * CartItemController
 *
 * Routes to manage items inside a user's cart.
 *
 * Path: /stores/:storeId/:userId/cart/items
 */
@Controller('stores/:storeId/:userId/cart/:cartId/items')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class CartItemController extends BaseController<
  CartItem,
  CartItemDto,
  CartItemDto,
  CartItemDto
> {
  static accessPolicies: AccessPolicies = {
    findAll: { requireAuthenticated: true },
    findOne: { requireAuthenticated: true, adminRole: undefined },
    create: { requireAuthenticated: true },
    update: { requireAuthenticated: true, adminRole: undefined },
    remove: { requireAuthenticated: true, adminRole: undefined },

    findAllForCart: { requireAuthenticated: true },
    addOrIncrement: { requireAuthenticated: true },
    updateQuantity: { requireAuthenticated: true },
    listForCart: { requireAuthenticated: true },
  };

  constructor(private readonly cartItemService: CartItemService) {
    super(cartItemService);
  }

  @Get('/paginated')
  @PaginatedResponse(CartItem)
  async findAllForCart(
    @Param('storeId') _storeId: string,
    @Param('userId', new ParseUUIDPipe()) _userId: string,
    @Param('cartId', new ParseUUIDPipe()) cartId: string,
    @Pagination() pagination: PaginationParams
  ): Promise<[CartItem[], number]> {
    return this.cartItemService.findByCartPaginated(cartId, pagination);
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
    @Body() dto: UpdateCartItemQuantityDto
  ): Promise<CartItem> {
    return this.cartItemService.updateQuantity(itemId, dto.quantity ?? 0);
  }
}
