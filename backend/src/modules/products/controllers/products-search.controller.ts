import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { ProductsService } from 'src/modules/products/services/products.service';
import {
  ProductDetailDto,
  ProductListDto,
} from 'src/modules/products/dto/product.dto';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';
import { RecordEvents } from 'src/common/decorators/record-event.decorator';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { PaginatedResponse } from 'src/common/decorators/paginated-response.decorator';

@Controller('/products')
@UseInterceptors(RecordEventInterceptor)
@RecordEvents({
  getProductById: {
    eventType: AnalyticsEventType.VIEW,
    productId: 'params.id',
    userId: 'user.id',
    invokedOn: 'product',
    when: 'after',
  },
})
export class ProductsSearchController {
  constructor(private readonly productsService: ProductsService) {}
  /**
   * GET /stores/products/search
   * Search products in a store with basic query
   */
  @Get('/search')
  @PaginatedResponse(ProductListDto)
  async advancedSearch(
    @Query('storeId') storeId: string,
    @Query('query') query?: string,
    @Query('categoryIds') categoryIds?: string, // Comma-separated IDs
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('inStock') inStock?: string,
    @Query('sortBy') sortBy?: 'recent' | 'price' | 'rating' | 'views' | 'sales',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<[ProductListDto[], number]> {
    const parsedLimit = limit ? Math.min(parseInt(limit), 50) : 20;
    const parsedOffset = offset ? parseInt(offset) : 0;

    return await this.productsService.advancedProductSearch({
      storeId,
      query: query?.trim(),
      categoryIds: categoryIds ? categoryIds.split(',') : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxRating: maxRating ? parseFloat(maxRating) : undefined,
      inStock: inStock === 'true',
      sortBy: sortBy || 'recent',
      sortOrder: sortOrder || 'DESC',
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get('/:id')
  async getProductById(@Param('id') id: string): Promise<ProductDetailDto> {
    return this.productsService.findProductDetail(id);
  }
}
