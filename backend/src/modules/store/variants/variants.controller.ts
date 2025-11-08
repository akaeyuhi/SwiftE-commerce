import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { VariantsService } from 'src/modules/store/variants/variants.service';
import { CreateVariantDto } from 'src/modules/store/variants/dto/create-variant.dto';
import { UpdateVariantDto } from 'src/modules/store/variants/dto/update-variant.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import {
  Pagination,
  PaginationParams,
} from 'src/common/decorators/pagination.decorator';
import { PaginatedResponse } from 'src/common/decorators/paginated-response.decorator';

/**
 * VariantsController
 *
 * Manages product variants including SKU, pricing, attributes, and inventory.
 * All routes require authentication and appropriate store-level permissions.
 *
 * Inventory adjustments automatically trigger low-stock alerts when thresholds are crossed.
 */
@ApiTags('Product Variants')
@ApiBearerAuth()
@Controller('stores/:storeId/products/:productId/variants')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
export class VariantsController extends BaseController<
  ProductVariant,
  CreateVariantDto,
  UpdateVariantDto
> {
  static accessPolicies: AccessPolicies = {
    findAll: { requireAuthenticated: true },
    findOne: { requireAuthenticated: true },
    create: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    update: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    remove: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    listByProduct: { requireAuthenticated: true },
    findBySku: { requireAuthenticated: true },
    findAllProductVariants: { requireAuthenticated: true },
    findOneVariant: { requireAuthenticated: true },
    addAttributes: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
    },
    removeAttribute: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
    },
    setInventory: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
    },
    adjustInventory: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    updatePrice: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
  };

  constructor(private readonly variantsService: VariantsService) {
    super(variantsService);
  }

  /**
   * List all variants for a product
   */
  @Get()
  @ApiOperation({
    summary: 'List all variants for a product',
    description:
      'Retrieves all product variants including SKU, price, attributes, and inventory levels',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'productId', description: 'Product UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'List of product variants',
    type: () => [ProductVariant],
  })
  @PaginatedResponse(ProductVariant)
  async findAllProductVariants(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Pagination() pagination: PaginationParams
  ): Promise<[ProductVariant[], number]> {
    return this.variantsService.listByProduct(productId, pagination);
  }

  /**
   * Find variant by SKU
   */
  @Get('by-sku/:sku')
  @ApiOperation({
    summary: 'Find variant by SKU',
    description:
      'Retrieve a specific product variant using its unique SKU identifier',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'productId', description: 'Product UUID', type: 'string' })
  @ApiParam({
    name: 'sku',
    description: 'Product SKU',
    type: 'string',
    example: 'P-1A2B-3C4D',
  })
  @ApiResponse({
    status: 200,
    description: 'Product variant found',
    type: () => ProductVariant,
  })
  @ApiNotFoundResponse({ description: 'Variant with specified SKU not found' })
  async findBySku(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('sku') sku: string
  ): Promise<ProductVariant | null> {
    return this.variantsService.findBySku(sku);
  }

  /**
   * Add or merge attributes to variant
   */
  @Post(':id/attributes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add or update variant attributes',
    description: `Performs shallow merge of provided attributes into existing JSONB attributes field. Useful for size, color, material, etc.`,
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'productId', description: 'Product UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Variant UUID', type: 'string' })
  @ApiBody({
    description: 'Attributes to add/merge (JSON object)',
    schema: {
      type: 'object',
      example: { size: 'L', color: 'Blue', material: 'Cotton' },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Variant attributes updated successfully',
    type: () => ProductVariant,
  })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  async addAttributes(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() patch: Record<string, any>
  ): Promise<ProductVariant> {
    return this.variantsService.addAttributes(id, patch);
  }

  /**
   * Remove specific attribute key
   */
  @Delete(':id/attributes/:key')
  @ApiOperation({
    summary: 'Remove a specific attribute',
    description:
      'Deletes a single attribute key from the variant attributes JSONB object',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'productId', description: 'Product UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Variant UUID', type: 'string' })
  @ApiParam({
    name: 'key',
    description: 'Attribute key to remove',
    type: 'string',
    example: 'color',
  })
  @ApiResponse({
    status: 200,
    description: 'Attribute removed successfully',
    type: () => ProductVariant,
  })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  async removeAttribute(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('key') key: string
  ): Promise<ProductVariant> {
    return this.variantsService.removeAttribute(id, key);
  }

  /**
   * Set absolute inventory quantity
   */
  @Post(':id/inventory')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set inventory quantity',
    description: `Sets absolute inventory quantity for variant. Creates inventory record if not exists. Does NOT trigger low-stock alerts (use PATCH for adjustments).`,
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'productId', description: 'Product UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Variant UUID', type: 'string' })
  @ApiBody({
    description: 'New absolute inventory quantity',
    schema: {
      type: 'object',
      required: ['quantity'],
      properties: {
        quantity: {
          type: 'number',
          minimum: 0,
          description: 'Absolute quantity to set',
          example: 100,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory set successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid quantity value' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  async setInventory(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateVariantDto
  ) {
    return this.variantsService.setInventory(storeId, id, body.quantity);
  }

  /**
   * Adjust inventory by delta
   */
  @Patch(':id/inventory')
  @ApiOperation({
    summary: 'Adjust inventory by delta',
    description:
      'Adjusts inventory by positive or negative delta. ' +
      'Automatically triggers low-stock/out-of-stock alerts when thresholds are crossed. ' +
      'Use negative values for sales, positive for restocking.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'productId', description: 'Product UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Variant UUID', type: 'string' })
  @ApiBody({
    description: 'Inventory adjustment delta',
    schema: {
      type: 'object',
      required: ['delta'],
      properties: {
        delta: {
          type: 'number',
          description: 'Amount to adjust (positive = add, negative = subtract)',
          example: -5,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Inventory adjusted successfully. Low-stock alerts sent if threshold crossed.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid delta or insufficient stock for negative adjustment',
  })
  @ApiNotFoundResponse({ description: 'Variant or inventory not found' })
  async adjustInventory(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { delta: number }
  ) {
    return this.variantsService.adjustInventory(id, body.delta);
  }

  /**
   * Update variant price
   */
  @Patch(':id/price')
  @ApiOperation({
    summary: 'Update variant price',
    description: 'Updates the selling price for a product variant',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: 'string' })
  @ApiParam({ name: 'productId', description: 'Product UUID', type: 'string' })
  @ApiParam({ name: 'id', description: 'Variant UUID', type: 'string' })
  @ApiBody({
    description: 'New price',
    schema: {
      type: 'object',
      required: ['price'],
      properties: {
        price: {
          type: 'number',
          minimum: 0,
          description: 'New price in store currency',
          example: 29.99,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Price updated successfully',
    type: () => ProductVariant,
  })
  @ApiBadRequestResponse({ description: 'Invalid price value' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  async updatePrice(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateVariantDto
  ) {
    return this.variantsService.updatePrice(id, body.price!);
  }
}
