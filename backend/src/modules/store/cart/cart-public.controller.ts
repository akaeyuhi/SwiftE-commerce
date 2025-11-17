import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import { CartService } from 'src/modules/store/cart/cart.service';
import {
  Pagination,
  PaginationParams,
} from 'src/common/decorators/pagination.decorator';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { PaginatedResponse } from 'src/common/decorators/paginated-response.decorator';

@Controller('/stores/:userId/cart')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard, EntityOwnerGuard)
export class PublicCartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Return all carts for a user across stores, with store objects attached.
   *
   * Route: GET /stores/:userId/cart/merged
   *
   * @param userId - UUID of the user
   * @param pagination
   * @returns array of ShoppingCart (each includes store relation)
   */
  @Get('merged')
  @PaginatedResponse(ShoppingCart)
  async getUserMergedCarts(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Pagination() pagination: PaginationParams
  ) {
    return this.cartService.getUserMergedCarts(userId, pagination);
  }
}
