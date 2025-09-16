import {
  Controller,
  UseGuards,
  Get,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CartService } from 'src/modules/store/modules/cart/cart.service';
import { CreateCartDto } from 'src/modules/store/modules/cart/dto/create-cart.dto';
import { UpdateCartDto } from 'src/modules/store/modules/cart/dto/update-cart.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { ShoppingCart } from 'src/entities/cart.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/auth/modules/policy/policy.types';

/**
 * CartController
 *
 * Routes for working with a user's cart in a specific store.
 *
 * Path: /stores/:storeId/:userId/cart
 *
 * Important: we use both JwtAuthGuard and StoreRolesGuard across the controller.
 * Authorization rules are declared in static accessPolicies.
 */
@Controller('stores/:storeId/:userId/cart')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
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
  };

  constructor(private readonly cartService: CartService) {
    super(cartService);
  }

  /**
   * Get the cart for the user in the specified store.
   *
   * If the cart does not exist, returns 404. Use POST to create or ensure a cart exists.
   *
   * @param storeId - UUID of the store
   * @param userId - UUID of the user
   * @returns the ShoppingCart for the (user, store)
   */
  @Get()
  async findOneByUserAndStore(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string
  ): Promise<ShoppingCart | null> {
    return this.cartService.getCartByUserAndStore(userId, storeId);
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
  @Post()
  async getOrCreateCart(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
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
   * @returns array of ShoppingCart (each includes store relation)
   */
  @Get('merged')
  async getUserMergedCarts(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string
  ): Promise<ShoppingCart[]> {
    return this.cartService.getUserMergedCarts(userId);
  }
}
