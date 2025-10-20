import {
  Controller,
  UseGuards,
  Get,
  Post,
  Param,
  Body,
  Put,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CategoriesService } from 'src/modules/store/categories/categories.service';
import { CreateCategoryDto } from 'src/modules/store/categories/dto/create-category.dto';
import { UpdateCategoryDto } from 'src/modules/store/categories/dto/update-category.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Category } from 'src/entities/store/product/category.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { CategoryDto } from 'src/modules/store/categories/dto/category.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';

/**
 * CategoriesController
 *
 * Provides CRUD endpoints for categories and a few helpers:
 *  - list categories referenced by a store
 *  - build category tree
 *  - find products by category (optionally restricted to store)
 *  - assign category to a product
 *
 * Authorization:
 *  - read endpoints: authenticated users
 *  - mutating endpoints: store admins
 */
@Controller('stores/:storeId/categories')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class CategoriesController extends BaseController<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryDto
> {
  static accessPolicies: AccessPolicies = {
    findAll: { requireAuthenticated: true, adminRole: undefined },
    create: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
      adminRole: undefined,
    },
    update: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
      adminRole: undefined,
    },
    remove: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
      adminRole: undefined,
    },

    getTree: { requireAuthenticated: true },
    findProductsByCategory: { requireAuthenticated: true },
    assignCategoryToProduct: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
    },
  };

  constructor(private readonly categoriesService: CategoriesService) {
    super(categoriesService);
  }

  /**
   * Return an in-memory category tree (root categories with nested children).
   *
   * Route: GET /stores/:storeId/products/:productId/categories/tree
   *
   * @returns Promise resolving to an array of root Category objects, each containing nested `children`.
   */
  @Get('tree')
  async getTree(): Promise<CategoryDto[]> {
    return this.categoriesService.getTree();
  }

  @Post()
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Param('storeId', new ParseUUIDPipe()) storeId: string
  ) {
    return this.categoriesService.create(createCategoryDto, storeId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * Get products assigned to this category. If `storeId` is provided it will
   * filter products to that store.
   *
   * Route: GET /stores/:storeId/products/:productId/categories/:id/products
   *
   * @param storeId - UUID of the store to filter products by (optional in some models but required by route).
   * @param _productId - UUID of the product in the route (kept for route consistency/authorization).
   * @param id - UUID of the category to list products for.
   * @returns Promise resolving to an array of Product entities associated with the category (optionally store-filtered).
   */
  // @Get(':id/products')
  // async findProductsByCategory(
  //   @Param('storeId', new ParseUUIDPipe()) storeId: string,
  //   @Param('productId', new ParseUUIDPipe()) _productId: string,
  //   @Param('id', new ParseUUIDPipe()) id: string
  // ): Promise<Product[]> {
  //   return this.categoriesService.findProductsByCategory(id, storeId);
  // }
  //
  // /**
  //  * Assign a category to the product identified by :productId.
  //  *
  //  * Route: POST /stores/:storeId/products/:productId/categories/assign/:categoryId
  //  *
  //  * This endpoint allows store admins to attach an existing category to a product.
  //  *
  //  * @param _storeId - UUID of the store (used for authorization context).
  //  * @param productId - UUID of the product which will receive the category.
  //  * @param categoryId - UUID of the existing category to assign to the product.
  //  * @returns Promise resolving to the updated Product entity with the category assigned.
  //  */
  // @Post('assign/:categoryId')
  // async assignCategoryToProduct(
  //   @Param('storeId', new ParseUUIDPipe()) _storeId: string,
  //   @Param('productId', new ParseUUIDPipe()) productId: string,
  //   @Param('categoryId', new ParseUUIDPipe()) categoryId: string
  // ): Promise<Product> {
  //   return this.categoriesService.assignCategoryToProduct(
  //     categoryId,
  //     productId
  //   );
  // }
}
