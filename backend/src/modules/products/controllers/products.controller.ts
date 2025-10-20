import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from 'src/modules/products/services/products.service';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { UpdateProductDto } from 'src/modules/products/dto/update-product.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Product } from 'src/entities/store/product/product.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';
import { RecordEvents } from 'src/common/decorators/record-event.decorator';
import { UploadProductPhotos } from 'src/common/decorators/upload-product-photos.decorator';
import {
  ProductDetailDto,
  ProductDto,
  ProductListDto,
  ProductStatsDto,
} from 'src/modules/products/dto/product.dto';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { AdvancedSearchDto } from 'src/modules/products/dto/advanced-search.dto';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { StoreRole } from 'src/common/decorators/store-role.decorator';
import { ApiResponse } from '@nestjs/swagger';

/**
 * ProductsController
 *
 * Manages product operations including:
 * - CRUD operations with photo uploads
 * - Quick statistics (cached values)
 * - Product rankings and leaderboards
 * - Advanced search and autocomplete
 * - Category management
 * - Analytics event tracking
 */
@Controller('stores/:storeId/products')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
@UseInterceptors(RecordEventInterceptor)
@RecordEvents({
  findOne: {
    eventType: AnalyticsEventType.VIEW,
    storeId: 'params.storeId',
    productId: 'params.id',
    userId: 'user.id',
    invokedOn: 'product',
    when: 'after',
  },
})
export class ProductsController extends BaseController<
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductDto
> {
  static accessPolicies: AccessPolicies = {
    findAll: { requireAuthenticated: true, adminRole: AdminRoles.ADMIN },
    findOne: { requireAuthenticated: true, adminRole: undefined },
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
  };

  constructor(private readonly productsService: ProductsService) {
    super(productsService);
  }

  // ===============================
  // Product Listings & Discovery
  // ===============================

  /**
   * GET /stores/:storeId/products
   * List all products in a store with cached statistics
   */
  @Get('/byStore')
  async findAllProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string
  ): Promise<ProductListDto[]> {
    return await this.productsService.findAllByStoreAsList(storeId);
  }

  /**
   * GET /stores/:storeId/products/search
   * Search products in a store with basic query
   */
  @Get('search')
  async searchProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('sortBy')
    sortBy?: 'relevance' | 'views' | 'sales' | 'rating' | 'price' | 'recent'
  ): Promise<ProductListDto[]> {
    const maxLimit = limit ? Math.min(parseInt(limit), 50) : 20;
    return await this.productsService.searchProducts(storeId, query, maxLimit, {
      sortBy,
    });
  }

  /**
   * POST /stores/:storeId/products/advanced-search
   * Advanced product search with comprehensive filters
   *
   * @example
   * POST /stores/123/products/advanced-search
   * Body: {
   *   "query": "laptop",
   *   "minPrice": 500,
   *   "maxPrice": 2000,
   *   "categoryIds": ["cat-1", "cat-2"],
   *   "minRating": 4,
   *   "inStock": true,
   *   "sortBy": "price",
   *   "sortOrder": "ASC",
   *   "limit": 20,
   *   "offset": 0
   * }
   */
  @Post('advanced-search')
  @HttpCode(HttpStatus.OK)
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async advancedSearch(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() searchDto: AdvancedSearchDto
  ): Promise<{
    products: ProductListDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const result = await this.productsService.advancedProductSearch({
      storeId,
      ...searchDto,
    });

    const page = searchDto.offset
      ? Math.floor(searchDto.offset / (searchDto.limit || 20)) + 1
      : 1;

    return {
      products: result.products,
      total: result.total,
      page,
      limit: searchDto.limit || 20,
    };
  }

  /**
   * GET /stores/:storeId/products/autocomplete
   * Get autocomplete suggestions for product search
   *
   * @example
   * GET /stores/123/products/autocomplete?q=lap&limit=10
   *
   * Response:
   * [
   *   {
   *     "id": "prod-1",
   *     "name": "Laptop Pro 15",
   *     "mainPhotoUrl": "https://...",
   *     "minPrice": 1299.99
   *   },
   *   ...
   * ]
   */
  @Get('autocomplete')
  async autocomplete(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      mainPhotoUrl?: string;
      minPrice?: number;
    }>
  > {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const maxLimit = limit ? Math.min(parseInt(limit), 20) : 10;
    return await this.productsService.autocompleteProducts(
      storeId,
      query.trim(),
      maxLimit
    );
  }

  // ===============================
  // Product Details & Statistics
  // ===============================

  /**
   * GET /stores/:storeId/products/:id
   * Get full product details with all relations
   */
  @Get(':id/detailed')
  async findOneProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ProductDetailDto> {
    return await this.productsService.findProductDetail(id);
  }

  /**
   * GET /stores/:storeId/products/:id/stats
   * Get detailed statistics for a product
   */
  @Get(':id/stats')
  async getProductStats(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ProductStatsDto> {
    return await this.productsService.getProductStats(id);
  }

  /**
   * GET /stores/:storeId/products/:id/quick-stats
   * Get quick stats (cached values only)
   */
  @Get(':id/quick-stats')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async getQuickStats(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ProductStatsDto> {
    return this.getProductStats(storeId, id);
  }

  // ===============================
  // Product Management
  // ===============================

  /**
   * POST /stores/:storeId/products
   * Create a new product with optional photos
   */
  @UploadProductPhotos()
  @Post()
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 200,
    description: 'The found record.',
    type: ProductDto,
  })
  async createProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() body: CreateProductDto,
    @UploadedFiles(new ParseFilePipe({ fileIsRequired: false }))
    files?: { photos: Express.Multer.File[]; mainPhoto: Express.Multer.File[] }
  ) {
    return await this.productsService.create(
      { ...body, storeId } as CreateProductDto,
      files?.photos,
      files?.mainPhoto?.[0]
    );
  }

  /**
   * DELETE /stores/:storeId/products/:id
   * Soft delete a product
   */
  @Delete(':id/soft')
  @StoreRole(StoreRoles.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.productsService.softDelete(id);
    return { success: true };
  }

  // ===============================
  // Photo Management
  // ===============================

  /**
   * POST /stores/:storeId/products/:id/photos
   * Add photos to an existing product
   */
  @UploadProductPhotos()
  @Post(':id/photos')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async addPhotosToProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFiles() files?: { photos: Express.Multer.File[] }
  ) {
    if (!files || !files.photos || files.photos.length === 0) {
      throw new BadRequestException('No photos uploaded');
    }

    return this.productsService.addPhotos(productId, storeId, files.photos);
  }

  /**
   * POST /stores/:storeId/products/:id/photos/main
   * Set main photo for a product
   */
  @UploadProductPhotos()
  @Post(':id/photos/main')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async addMainPhotoToProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFiles() files: { mainPhoto: Express.Multer.File[] }
  ) {
    if (!files || !files?.mainPhoto || !files?.mainPhoto?.[0]) {
      throw new BadRequestException('No main photo uploaded');
    }

    return this.productsService.addMainPhoto(
      productId,
      storeId,
      files.mainPhoto
    );
  }

  /**
   * DELETE /stores/:storeId/products/:productId/photos/:photoId
   * Delete a product photo
   */
  @Delete(':productId/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @StoreRole(StoreRoles.ADMIN)
  async deletePhoto(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string
  ) {
    await this.productsService.removePhoto(photoId);
    return { success: true };
  }

  // ===============================
  // Category Management
  // ===============================

  /**
   * GET /stores/:storeId/products/category/:categoryId
   * Get all products in a category
   */
  @Get('category/:categoryId')
  async findProductsByCategory(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string
  ): Promise<ProductListDto[]> {
    return this.productsService.findProductsByCategory(categoryId, storeId);
  }

  /**
   * POST /stores/:storeId/products/:id/categories/:categoryId
   * Assign a category to a product
   */
  @Post(':id/categories/:categoryId')
  @HttpCode(HttpStatus.OK)
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async assignCategoryToProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string
  ): Promise<ProductDetailDto> {
    return this.productsService.attachCategoryToProduct(productId, categoryId);
  }

  /**
   * DELETE /stores/:storeId/products/:id/categories/:categoryId
   * Remove a category from a product
   */
  @Delete(':id/categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @StoreRole(StoreRoles.ADMIN)
  async removeCategoryFromProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string
  ) {
    await this.productsService.removeCategoryFromProduct(productId, categoryId);
    return { success: true };
  }

  // ===============================
  // Admin Operations
  // ===============================

  /**
   * POST /stores/:storeId/products/:id/recalculate-stats
   * Manually recalculate cached statistics for a product
   */
  @Post(':id/recalculate-stats')
  @HttpCode(HttpStatus.OK)
  @StoreRole(StoreRoles.ADMIN)
  async recalculateStats(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.productsService.recalculateProductStats(id);
    return {
      success: true,
      message: 'Product statistics recalculated successfully',
      productId: id,
    };
  }

  /**
   * POST /stores/:storeId/products/:id/increment-view
   * Manually increment view count (alternative to automatic tracking)
   */
  @Post(':id/increment-view')
  @HttpCode(HttpStatus.OK)
  @StoreRole(StoreRoles.ADMIN)
  async incrementViewCount(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.productsService.incrementViewCount(id);
    return {
      success: true,
      message: 'View count incremented',
      productId: id,
    };
  }
}
