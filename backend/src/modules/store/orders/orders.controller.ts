import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Order } from 'src/entities/store/product/order.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import { EntityOwner } from 'src/common/decorators/entity-owner.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import { Request } from 'express';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { RecordEvent } from 'src/common/decorators/record-event.decorator';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { ReturnOrderDto } from 'src/modules/store/orders/dto/return-order.dto';
import { CancelOrderDto } from 'src/modules/store/orders/dto/cancel-order.dto';
import { UpdateShippingInfoDto } from 'src/modules/store/orders/dto/update-shipping-info.dto';

/**
 * OrdersController
 *
 * Comprehensive order management with automatic inventory integration.
 *
 * Features:
 * - Order creation with automatic inventory deduction
 * - Order status management (pending → paid → shipped → delivered)
 * - Order cancellation with inventory restoration
 * - Order returns with partial/full inventory restoration
 * - Real-time inventory impact tracking
 * - Low-stock alert triggering
 *
 * Base path: /stores/:storeId/orders
 *
 * Access Control:
 * - List all orders: Store admins only
 * - Create order: Any authenticated user (creates order for themselves)
 * - View order: Order owner OR store admin OR site admin
 * - Update status/Cancel/Return: Store admin OR site admin
 * - View user orders: Owner OR store admin OR site admin
 *
 * Inventory Integration:
 * All inventory operations are transactional and trigger notifications when thresholds crossed.
 */
@ApiTags('Orders')
@ApiBearerAuth()
@Controller('stores/:storeId/orders')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard, EntityOwnerGuard)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
export class OrdersController extends BaseController<
  Order,
  CreateOrderDto,
  UpdateOrderDto
> {
  private readonly logger = new Logger(OrdersController.name);

  /**
   * Access policies for each endpoint.
   *
   * Evaluated by AdminGuard, StoreRolesGuard, and EntityOwnerGuard.
   */
  static accessPolicies: AccessPolicies = {
    // Base CRUD
    findAll: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    findOne: { requireAuthenticated: true }, // Owner check via EntityOwnerGuard
    create: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    update: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    remove: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },

    // Store operations
    findAllByStore: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },

    // User operations
    createUserOrder: { requireAuthenticated: true },
    findByUser: { requireAuthenticated: true }, // Owner check via EntityOwnerGuard

    // Order lifecycle
    checkout: { requireAuthenticated: true }, // Owner check via EntityOwnerGuard
    updateStatus: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },

    // Inventory operations
    cancelOrder: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    returnOrder: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    getInventoryImpact: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
  };

  constructor(private readonly ordersService: OrdersService) {
    super(ordersService);
  }

  // ===============================
  // STORE OPERATIONS
  // ===============================

  /**
   * List all orders for the store.
   *
   * Returns orders with items, user, and inventory status.
   * Useful for store admin dashboard and order management.
   */
  @Get('all')
  @ApiOperation({
    summary: 'List all orders for store',
    description:
      'Returns all orders for this store including items, user info, and totals. ' +
      'Accessible by store admins and moderators.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Store UUID',
    type: 'string',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    type: [Order],
  })
  async findAllByStore(
    @Param('storeId', new ParseUUIDPipe()) storeId: string
  ): Promise<Order[]> {
    return this.ordersService.findByStore(storeId);
  }

  // ===============================
  // ORDER CREATION
  // ===============================

  /**
   * Create new order with automatic inventory deduction.
   *
   * Process:
   * 1. Validates inventory availability for all items
   * 2. Creates order in pending status
   * 3. Deducts inventory for each item (transactional)
   * 4. Triggers low-stock alerts if thresholds crossed
   * 5. Records analytics events
   *
   * If insufficient stock, returns 400 with detailed error.
   */
  @Post('create')
  @ApiOperation({
    summary: 'Create new order',
    description:
      'Creates order for authenticated user with automatic inventory deduction. ' +
      'Operation is transactional - if inventory deduction fails, order is not created. ' +
      'Triggers low-stock email alerts to store admins if thresholds crossed.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiBody({
    type: CreateOrderDto,
    description:
      'Order data including items array. Each item must have variantId and quantity.',
    examples: {
      simple: {
        summary: 'Simple order',
        value: {
          items: [
            {
              variantId: '123e4567-e89b-12d3-a456-426614174000',
              productId: '123e4567-e89b-12d3-a456-426614174001',
              productName: 'Blue T-Shirt',
              sku: 'TSHIRT-BLU-M',
              unitPrice: 29.99,
              quantity: 2,
            },
          ],
          shipping: {
            firstName: 'John',
            lastName: 'Doe',
            address: '123 Main St',
            city: 'New York',
            postalCode: '10001',
            country: 'US',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully, inventory deducted',
    type: Order,
  })
  @ApiBadRequestResponse({
    description: 'Insufficient stock or validation failed',
    schema: {
      example: {
        message: 'Order validation failed',
        errors: [
          'Insufficient stock for Blue T-Shirt (SKU: TSHIRT-BLU-M). Available: 1, Requested: 2',
        ],
      },
    },
  })
  @RecordEvent({
    eventType: AnalyticsEventType.CHECKOUT,
    storeId: 'params.storeId',
    userId: 'user.id',
    invokedOn: 'store',
    when: 'after',
  })
  async createUserOrder(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: CreateOrderDto,
    @Req() req: Request
  ): Promise<Order> {
    // Set storeId from route
    dto.storeId = dto.storeId ?? storeId;

    // Get current user
    const currentUserId = (req as any).user?.id;
    if (!currentUserId) {
      throw new BadRequestException('Authentication required');
    }

    // Security: Users can only create orders for themselves unless site admin
    if (
      dto.userId &&
      dto.userId !== currentUserId &&
      !(req as any).user?.isSiteAdmin
    ) {
      throw new BadRequestException('Cannot create order for another user');
    }

    dto.userId = dto.userId ?? currentUserId;

    this.logger.log(
      `Creating order for user ${dto.userId} in store ${storeId} with ${dto.items?.length || 0} items`
    );

    // Create order (includes inventory deduction and low-stock alerts)
    const order = await this.ordersService.createOrder(dto);

    this.logger.log(
      `Order ${order.id} created successfully. Total: ${order.totalAmount}`
    );

    return order;
  }

  // ===============================
  // ORDER RETRIEVAL
  // ===============================

  /**
   * Get single order by ID with full details.
   *
   * Includes:
   * - All order items with product/variant info
   * - User details
   * - Store information
   * - Shipping/billing addresses
   */
  @Get(':id')
  @EntityOwner({
    serviceToken: OrdersService,
    idParam: 'id',
    allowMissingEntity: false,
  })
  @ApiOperation({
    summary: 'Get order by ID',
    description:
      'Returns complete order details including items, user, and store info. ' +
      'Accessible by order owner, store admins, or site admins.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully',
    type: Order,
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Order> {
    return this.ordersService.getOrderWithItems(id);
  }

  /**
   * Get all orders for specific user within this store.
   *
   * Filtered to only show orders from the current store context.
   */
  @Get('user/:userId')
  @EntityOwner({ allowMissingEntity: true })
  @ApiOperation({
    summary: 'Get orders by user',
    description:
      'Returns all orders for a specific user within this store. ' +
      'Accessible by the user themselves, store admins, or site admins.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'userId', description: 'User UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User orders retrieved',
    type: [Order],
  })
  async findByUser(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string
  ): Promise<Order[]> {
    const orders = await this.ordersService.findByUser(userId);

    // Filter to only orders from this store
    return orders.filter(
      (o) => o.store && String(o.store.id) === String(_storeId)
    );
  }

  // ===============================
  // ORDER LIFECYCLE MANAGEMENT
  // ===============================

  /**
   * Mark order as paid (checkout completion).
   *
   * Note: Inventory was already deducted during order creation.
   * This endpoint updates status and records purchase analytics.
   */
  @Post(':id/checkout')
  @HttpCode(HttpStatus.OK)
  @EntityOwner({
    serviceToken: OrdersService,
    idParam: 'id',
    allowMissingEntity: false,
  })
  @ApiOperation({
    summary: 'Complete order checkout',
    description:
      'Marks order as paid after successful payment processing. ' +
      'Inventory was already deducted during order creation. ' +
      'Records purchase analytics event.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Order marked as paid',
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async checkout(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<void> {
    await this.ordersService.paid(id);
    this.logger.log(`Order ${id} marked as paid`);
  }

  /**
   * Update order status.
   *
   * Important: Cancelling or returning via this endpoint requires
   * using the dedicated /cancel or /return endpoints for proper
   * inventory restoration.
   */
  @Put(':id/status')
  @ApiOperation({
    summary: 'Update order status',
    description:
      'Updates order status. For cancellations and returns, use dedicated endpoints ' +
      'to ensure proper inventory restoration. ' +
      'Accessible by store admins and moderators.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: 'string' })
  @ApiBody({
    description: 'Status update',
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: Object.values(OrderStatus),
          description: 'New order status',
          example: OrderStatus.SHIPPED,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order status updated',
    type: Order,
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({
    description: 'Invalid status transition',
  })
  async updateStatus(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateOrderDto
  ): Promise<Order> {
    if (!body.status) {
      throw new BadRequestException('Status is required');
    }

    // Warn if trying to cancel/return via this endpoint
    if ([OrderStatus.CANCELLED, OrderStatus.RETURNED].includes(body.status)) {
      this.logger.warn(
        `Order ${id} status changed to ${body.status} via updateStatus endpoint. ` +
          `Consider using dedicated /cancel or /return endpoints for proper inventory handling.`
      );
    }

    const updated = await this.ordersService.updateStatus(id, body.status);

    this.logger.log(`Order ${id} status updated to ${body.status}`);

    return updated;
  }

  // ===============================
  // INVENTORY MANAGEMENT
  // ===============================

  /**
   * Cancel order and restore inventory.
   *
   * Automatically returns inventory to stock for all items.
   * Cannot cancel shipped or delivered orders.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel order',
    description:
      'Cancels order and automatically restores inventory to stock. ' +
      'All items in the order are returned to available inventory. ' +
      'Cannot cancel orders that have been shipped or delivered. ' +
      'Accessible by store admins and moderators.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: 'string' })
  @ApiBody({
    description: 'Cancellation details',
    required: false,
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for cancellation',
          example: 'Customer requested cancellation',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled, inventory restored',
    type: Order,
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({
    description: 'Cannot cancel shipped/delivered orders',
  })
  async cancelOrder(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelOrderDto
  ): Promise<Order> {
    this.logger.log(
      `Cancelling order ${id}. Reason: ${dto.reason || 'Not specified'}`
    );

    const cancelled = await this.ordersService.cancelOrder(id, dto.reason);

    this.logger.log(
      `Order ${id} cancelled successfully. Inventory restored for ${cancelled.items.length} items.`
    );

    return cancelled;
  }

  /**
   * Process order return and restore inventory.
   *
   * Supports both full and partial returns.
   * Only delivered orders can be returned.
   */
  @Post(':id/return')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process order return',
    description:
      'Processes return for delivered order and restores inventory. ' +
      'Supports full return (all items) or partial return (specific items). ' +
      'Only orders in DELIVERED status can be returned. ' +
      'Accessible by store admins and moderators.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: 'string' })
  @ApiBody({
    description: 'Return details',
    required: false,
    schema: {
      type: 'object',
      properties: {
        itemIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Order item IDs being returned (omit for full return)',
          example: [
            '123e4567-e89b-12d3-a456-426614174000',
            '123e4567-e89b-12d3-a456-426614174001',
          ],
        },
        reason: {
          type: 'string',
          description: 'Return reason',
          example: 'Product defective',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Return processed, inventory restored',
    type: Order,
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({
    description: 'Only delivered orders can be returned',
  })
  async returnOrder(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReturnOrderDto
  ): Promise<Order> {
    const returnType =
      dto.itemIds && dto.itemIds.length > 0 ? 'Partial' : 'Full';

    this.logger.log(
      `Processing ${returnType.toLowerCase()} return for order ${id}. ` +
        `Reason: ${dto.reason || 'Not specified'}`
    );

    const returned = await this.ordersService.returnOrder(id, dto.itemIds);

    this.logger.log(
      `${returnType} return processed for order ${id}. ` +
        `Inventory restored for ${dto.itemIds?.length || returned.items.length} items.`
    );

    return returned;
  }

  /**
   * Get inventory impact summary for order.
   *
   * Shows how many units were deducted and estimated value.
   * Useful for order preview and admin dashboards.
   */
  @Get(':id/inventory-impact')
  @ApiOperation({
    summary: 'Get order inventory impact',
    description:
      'Returns summary of inventory changes caused by this order. ' +
      'Includes total units deducted, number of items, and estimated value. ' +
      'Useful for analytics and inventory management dashboards.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Inventory impact retrieved',
    schema: {
      type: 'object',
      properties: {
        totalItems: {
          type: 'number',
          description: 'Total number of different items',
          example: 3,
        },
        totalUnits: {
          type: 'number',
          description: 'Total units across all items',
          example: 15,
        },
        itemsWithInventory: {
          type: 'number',
          description: 'Number of items with inventory tracking',
          example: 2,
        },
        estimatedValue: {
          type: 'number',
          description: 'Total estimated value',
          example: 299.99,
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async getInventoryImpact(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ) {
    return this.ordersService.getOrderInventoryImpact(id);
  }

  /**
   * Update order shipping information (tracking, delivery dates).
   */
  @Put(':id/shipping')
  @ApiOperation({
    summary: 'Update order shipping information',
    description:
      'Updates tracking number, estimated delivery date, and other shipping details. ' +
      'If order status is not SHIPPED, it will be automatically updated.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: 'string' })
  @ApiBody({
    description: 'Shipping information update',
    schema: {
      type: 'object',
      properties: {
        trackingNumber: {
          type: 'string',
          description: 'Carrier tracking number',
          example: '1Z999AA10123456784',
        },
        estimatedDeliveryDate: {
          type: 'string',
          format: 'date-time',
          description: 'Estimated delivery date',
          example: '2025-10-10T12:00:00Z',
        },
        shippingMethod: {
          type: 'string',
          description: 'Shipping method used',
          example: 'UPS Ground',
        },
        deliveryInstructions: {
          type: 'string',
          description: 'Special delivery instructions',
          example: 'Leave at front door',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Shipping information updated, notification sent if status changed to SHIPPED',
    type: Order,
  })
  async updateShippingInfo(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body()
    dto: UpdateShippingInfoDto
  ): Promise<Order> {
    return this.ordersService.updateShippingInfo(id, dto);
  }

  /**
   * Mark order as delivered.
   */
  @Post(':id/delivered')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark order as delivered',
    description:
      'Updates order status to DELIVERED and sets delivered timestamp. ' +
      'Triggers delivery confirmation email to customer.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Order marked as delivered, notification sent',
    type: Order,
  })
  async markAsDelivered(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<Order> {
    return this.ordersService.markAsDelivered(id);
  }

  // ===============================
  // ADMIN OPERATIONS
  // ===============================

  /**
   * Delete order (soft delete recommended in production).
   *
   * Note: Consider soft delete to maintain order history.
   * This does NOT restore inventory - use /cancel endpoint instead.
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete order',
    description:
      '⚠️ Permanently deletes order. Does NOT restore inventory. ' +
      'For cancellations with inventory restoration, use /cancel endpoint. ' +
      'Consider implementing soft delete for audit trail.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Order deleted',
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    this.logger.warn(
      `Deleting order ${id}. Inventory will NOT be restored. ` +
        `Consider using /cancel endpoint instead.`
    );

    await this.ordersService.remove(id);

    this.logger.log(`Order ${id} deleted`);
  }
}
