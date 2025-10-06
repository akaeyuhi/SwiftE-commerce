import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from 'src/modules/products/products.service';
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
  ProductDto,
  ProductListDto,
  ProductDetailDto,
  ProductStatsDto,
} from 'src/modules/products/dto/product.dto';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';

/**
 * ProductsController
 *
 * Manages product operations including:
 * - CRUD operations with photo uploads
 * - Quick statistics (cached values)
 * - Product rankings and leaderboards
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
  @Get()
  async findAllProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string
  ): Promise<ProductListDto[]> {
    try {
      return await this.productsService.findAllByStoreAsList(storeId);
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch products: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/:storeId/products/search
   * Search products in a store
   */
  @Get('search')
  async searchProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string
  ): Promise<ProductListDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 20;
      return await this.productsService.searchProducts(
        storeId,
        query,
        maxLimit
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to search products: ${error.message}`
      );
    }
  }

  // ===============================
  // Product Details & Statistics
  // ===============================

  /**
   * GET /stores/:storeId/products/:id
   * Get full product details with all relations
   */
  @Get(':id')
  async findOneProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ProductDetailDto> {
    try {
      return await this.productsService.findProductDetail(id);
    } catch (error) {
      throw new BadRequestException(`Failed to get product: ${error.message}`);
    }
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
    try {
      return await this.productsService.getProductStats(id);
    } catch (error) {
      throw new BadRequestException(
        `Failed to get product stats: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/:storeId/products/:id/quick-stats
   * Get quick stats (cached values only)
   */
  @Get(':id/quick-stats')
  async getQuickStats(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ProductStatsDto> {
    return this.getProductStats(storeId, id);
  }

  // ===============================
  // Leaderboards & Rankings
  // ===============================

  /**
   * GET /stores/:storeId/products/top/views
   * Get top products by view count
   */
  @Get('top/views')
  async getTopProductsByViews(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('limit') limit?: string
  ): Promise<ProductListDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
      return await this.productsService.getTopProductsByViews(
        storeId,
        maxLimit
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top products: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/:storeId/products/top/sales
   * Get top products by sales count
   */
  @Get('top/sales')
  async getTopProductsBySales(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('limit') limit?: string
  ): Promise<ProductListDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
      return await this.productsService.getTopProductsBySales(
        storeId,
        maxLimit
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top products: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/:storeId/products/top/rated
   * Get top rated products
   */
  @Get('top/rated')
  async getTopRatedProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('limit') limit?: string
  ): Promise<ProductListDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
      return await this.productsService.getTopRatedProducts(storeId, maxLimit);
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top products: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/:storeId/products/top/conversion
   * Get top products by conversion rate
   */
  @Get('top/conversion')
  async getTopProductsByConversion(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('limit') limit?: string
  ): Promise<ProductListDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
      return await this.productsService.getTopProductsByConversionRate(
        storeId,
        maxLimit
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top products: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/:storeId/products/trending
   * Get trending products (high recent activity)
   */
  @Get('trending')
  async getTrendingProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('limit') limit?: string,
    @Query('days') days?: string
  ): Promise<ProductListDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
      const daysPeriod = days ? parseInt(days) : 7;
      return await this.productsService.getTrendingProducts(
        storeId,
        maxLimit,
        daysPeriod
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to get trending products: ${error.message}`
      );
    }
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
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() body: CreateProductDto,
    @UploadedFiles() photos?: Express.Multer.File[],
    @UploadedFile() mainPhoto?: Express.Multer.File
  ) {
    if (!body || !body.name) {
      throw new BadRequestException('name is required');
    }

    return await this.productsService.create(
      { ...body, storeId } as CreateProductDto,
      photos,
      mainPhoto
    );
  }

  /**
   * PATCH /stores/:storeId/products/:id
   * Update product details
   */
  @Post(':id')
  async updateProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProductDto
  ): Promise<ProductDto> {
    return super.update(id, updateDto);
  }

  /**
   * DELETE /stores/:storeId/products/:id
   * Soft delete a product
   */
  @Delete(':id')
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
  async addPhotosToProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFiles() photos?: Express.Multer.File[]
  ) {
    if (!photos || photos.length === 0) {
      throw new BadRequestException('No photos uploaded');
    }

    return this.productsService.addPhotos(productId, storeId, photos);
  }

  /**
   * POST /stores/:storeId/products/:id/photos/main
   * Set main photo for a product
   */
  @UploadProductPhotos()
  @Post(':id/photos/main')
  async addMainPhotoToProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFile() photo: Express.Multer.File
  ) {
    if (!photo) {
      throw new BadRequestException('No photo uploaded');
    }

    return this.productsService.addMainPhoto(productId, storeId, photo);
  }

  /**
   * DELETE /stores/:storeId/products/:productId/photos/:photoId
   * Delete a product photo
   */
  @Delete(':productId/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  ): Promise<Product[]> {
    return this.productsService.findProductsByCategory(categoryId, storeId);
  }

  /**
   * POST /stores/:storeId/products/:id/categories/:categoryId
   * Assign a category to a product
   */
  @Post(':id/categories/:categoryId')
  @HttpCode(HttpStatus.OK)
  async assignCategoryToProduct(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string
  ): Promise<Product> {
    return this.productsService.attachCategoryToProduct(productId, categoryId);
  }

  /**
   * DELETE /stores/:storeId/products/:id/categories/:categoryId
   * Remove a category from a product
   */
  @Delete(':id/categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  async recalculateStats(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      await this.productsService.recalculateProductStats(id);
      return {
        success: true,
        message: 'Product statistics recalculated successfully',
        productId: id,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to recalculate stats: ${error.message}`
      );
    }
  }

  /**
   * POST /stores/:storeId/products/:id/increment-view
   * Manually increment view count (alternative to automatic tracking)
   */
  @Post(':id/increment-view')
  @HttpCode(HttpStatus.OK)
  async incrementViewCount(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      await this.productsService.incrementViewCount(id);
      return {
        success: true,
        message: 'View count incremented',
        productId: id,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to increment view: ${error.message}`
      );
    }
  }
}
