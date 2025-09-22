import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from 'src/modules/store/orders/orders.service';
import { CreateOrderDto } from 'src/modules/store/orders/dto/create-order.dto';
import { UpdateOrderDto } from 'src/modules/store/orders/dto/update-order.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Order } from 'src/entities/store/product/order.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { EntityOwnerGuard } from 'src/common/guards/entity-owner.guard';
import { EntityOwner } from 'src/common/decorators/entity-owner.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/auth/policy/policy.types';
import { Request } from 'express';

/**
 * OrdersController
 *
 * Routes for creating and managing store orders.
 *
 * Base path: /stores/:storeId/orders
 *
 * Access rules:
 *  - Listing all store orders: store admins only
 *  - Creating an order: any authenticated user (owner = userId in DTO)
 *  - Getting a single order: order owner OR store admin OR site admin
 *  - Getting orders by user: owner OR store admin OR site admin
 *  - Updating order status: store admin OR site admin
 *  - Deleting order: store admin OR site admin
 */
@Controller('stores/:storeId/orders')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard, EntityOwnerGuard)
export class OrdersController extends BaseController<
  Order,
  CreateOrderDto,
  UpdateOrderDto
> {
  /**
   * Per-route access policies used by AdminGuard & StoreRolesGuard.
   *
   * - findAll: store admins only
   * - findOne: authenticated (ownership enforced via EntityOwnerGuard)
   * - create: authenticated users may create orders
   * - updateStatus/remove: store admins
   * - findByUser: authenticated (ownership enforced via EntityOwnerGuard)
   */
  static accessPolicies: AccessPolicies = {
    findAll: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    findOne: { requireAuthenticated: true },
    create: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
    },
    update: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    remove: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },

    // custom endpoints
    findAllByStore: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
    },
    createOrder: { requireAuthenticated: true },
    findByUser: { requireAuthenticated: true },
    updateStatus: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
    },
  };

  constructor(private readonly ordersService: OrdersService) {
    super(ordersService);
  }

  /**
   * List orders for the given store.
   *
   * Access: store admins (see accessPolicies).
   *
   * @param storeId store UUID from route
   */
  @Get()
  async findAllByStore(
    @Param('storeId', new ParseUUIDPipe()) storeId: string
  ): Promise<Order[]> {
    return this.ordersService.findByStore(storeId);
  }

  /**
   * Create an order for the given store.
   *
   * - The request must be authenticated (req.user).
   * - If the DTO lacks storeId, we set it from the route param.
   *
   * @param storeId - store UUID from route
   * @param dto - order creation DTO
   * @param req - express request (for current user)
   */
  @Post()
  async createOrder(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: CreateOrderDto,
    @Req() req: Request
  ): Promise<Order> {
    // Ensure storeId in DTO matches route
    dto.storeId = dto.storeId ?? storeId;

    // Optionally ensure that req.user.id === dto.userId (owner creates own order)
    // Permitted roles (store admin/site admin) can create orders for other users if you want.
    const currentUserId = (req as any).user?.id;
    if (!currentUserId) {
      // JwtAuthGuard should have prevented this, but guard for safety
      throw new Error('Authentication required');
    }

    // If the current user is not site admin and they are creating on behalf of another user,
    // you might want to disallow that. We will enforce that only owner or admins may create for others.
    if (
      dto.userId &&
      dto.userId !== currentUserId &&
      !(req as any).user?.isSiteAdmin
    ) {
      // If not site admin, deny creating orders for other users
      throw new Error('Cannot create order for another user');
    }

    // If DTO has no userId, set it to current user
    dto.userId = dto.userId ?? currentUserId;

    return this.ordersService.createOrder(dto);
  }

  /**
   * Get a specific order by id.
   *
   * Authorization:
   *  - EntityOwnerGuard will load the order and call PolicyService.isOwnerOrAdmin,
   *    so owner / store admin / site admin may access.
   *
   * @param id - order id param
   */
  @Get(':id')
  @EntityOwner({
    serviceToken: OrdersService,
    idParam: 'id',
    allowMissingEntity: false,
  })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Order> {
    return this.ordersService.getOrderWithItems(id);
  }

  /**
   * Get orders for a specific user (within the context of the store route).
   *
   * Authorization:
   *  - EntityOwnerGuard will probe request.params and allow owner of userId,
   *    or store admin / site admin.
   *
   * Route: GET /stores/:storeId/orders/user/:userId
   */
  @Get('user/:userId')
  @EntityOwner({ allowMissingEntity: true }) // no serviceToken -> guard probes userId/storeId from params
  async findByUser(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string
  ): Promise<Order[]> {
    const orders = await this.ordersService.findByUser(userId);
    return orders.filter(
      (o) => o.store && String(o.store.id) === String(_storeId)
    );
  }

  /**
   * Update order status (store admin or site admin).
   *
   * Route: PUT /stores/:storeId/orders/:id/status
   *
   * @param _storeId
   * @param id
   * @param body DTO with { status }
   */
  @Put(':id/status')
  async updateStatus(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateOrderDto
  ): Promise<Order> {
    // Access policy ensures only store admins (or site admins via AdminGuard) may call this
    return this.ordersService.updateStatus(id, body.status!);
  }
}
