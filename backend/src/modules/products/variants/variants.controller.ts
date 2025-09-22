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
} from '@nestjs/common';
import { VariantsService } from 'src/modules/products/variants/variants.service';
import { CreateVariantDto } from 'src/modules/products/variants/dto/create-variant.dto';
import { UpdateVariantDto } from 'src/modules/products/variants/dto/update-variant.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/auth/policy/policy.types';

/**
 * VariantsController
 *
 * Routes:
 *  - GET    /stores/:storeId/products/:productId/variants          -> list variants for product
 *  - GET    /stores/:storeId/products/:productId/variants/:id      -> get variant by id
 *  - GET    /stores/:storeId/products/:productId/variants/by-sku/:sku -> get variant by sku
 *  - POST   /stores/:storeId/products/:productId/variants          -> create variant (store-admin)
 *  - PUT    /stores/:storeId/products/:productId/variants/:id      -> update variant (store-admin)
 *  - DELETE /stores/:storeId/products/:productId/variants/:id      -> delete variant (store-admin)
 *
 *  - POST   /stores/:storeId/products/:productId/variants/:id/attributes  -> patch attributes (store-admin)
 *  - DELETE /stores/:storeId/products/:productId/variants/:id/attributes/:key -> remove attribute (store-admin)
 *
 *  - POST   /stores/:storeId/products/:productId/variants/:id/inventory  -> set inventory (store-admin)
 *  - PATCH  /stores/:storeId/products/:productId/variants/:id/inventory  -> adjust inventory (store-admin)
 *  - PATCH  /stores/:storeId/products/:productId/variants/:id/price  -> adjust price (store-admin)
 *
 * Authorization:
 *  - JwtAuthGuard and StoreRolesGuard are applied to the controller.
 *  - Per-route access policies are declared in `accessPolicies` below.
 */
@Controller('stores/:storeId/products/:productId/variants')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
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
    findAllProductVariants: {
      requireAuthenticated: true,
    },

    findOneVariant: {
      requireAuthenticated: true,
    },

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
   *  List variants for a product.
   *
   * @param productId - product id for which to list variants
   * @returns array of ProductVariant
   */
  @Get()
  async findAllProductVariants(
    @Param('productId', new ParseUUIDPipe()) productId: string
  ): Promise<ProductVariant[]> {
    return this.variantsService.listByProduct(productId);
  }

  /**
   * Find variant by SKU.
   *
   * @param _storeId - store id (unused but part of route)
   * @param _productId - product id (unused)
   * @param sku - SKU string
   * @returns ProductVariant | null
   */
  @Get('by-sku/:sku')
  async findBySku(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('sku') sku: string
  ): Promise<ProductVariant | null> {
    return this.variantsService.findBySku(sku);
  }

  /**
   * Patch / add attributes to a variant (shallow merge).
   *
   * @param _storeId - store id
   * @param _productId - product id
   * @param id - variant id
   * @param patch - partial attributes object to merge (JSON)
   * @returns updated ProductVariant
   */
  @Post(':id/attributes')
  async addAttributes(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() patch: Record<string, any>
  ): Promise<ProductVariant> {
    return this.variantsService.addAttributes(id, patch);
  }

  /**
   * Remove single attribute key from variant attributes.
   *
   * @param _storeId - store id
   * @param _productId - product id
   * @param id - variant id
   * @param key - attribute key to remove
   * @returns updated ProductVariant
   */
  @Delete(':id/attributes/:key')
  async removeAttribute(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('key') key: string
  ): Promise<ProductVariant> {
    return this.variantsService.removeAttribute(id, key);
  }

  /**
   * Set absolute inventory quantity for this variant within the store.
   *
   * Body: { quantity: number }
   *
   * Note: VariantsService.setInventory currently uses InventoryService APIs that
   * operate by variant id. If you later migrate inventory to be per-store,
   * consider extending service signatures to include storeId.
   *
   * @param storeId - store id
   * @param _productId - product id
   * @param id - variant id
   * @param body - { quantity: number }
   * @returns inventory (as returned by VariantsService)
   */
  @Post(':id/inventory')
  async setInventory(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { quantity: number }
  ) {
    return this.variantsService.setInventory(storeId, id, body.quantity);
  }

  /**
   * Adjust inventory by delta (positive or negative).
   *
   * Body: { delta: number }
   *
   * @param _storeId - store id
   * @param _productId - product id
   * @param id - variant id
   * @param body - { delta: number }
   */
  @Patch(':id/inventory')
  async adjustInventory(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { delta: number }
  ) {
    return this.variantsService.adjustInventory(id, body.delta);
  }

  /**
   * Update variant price.
   *
   * Body: { price: number }
   *
   * @param _storeId - store id
   * @param _productId - product id
   * @param id - variant id
   * @param body - { price: number }
   */
  @Patch(':id/inventory')
  async updatePrice(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { price: number }
  ) {
    return this.variantsService.updatePrice(id, body.price);
  }
}
