import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { Pagination } from 'src/common/decorators/pagination.decorator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Controller('/products')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
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
   * GET /stores/:storeId/products/search
   * Search products in a store with basic query
   */
  @Get('/search')
  @PaginatedResponse(ProductListDto)
  async searchProducts(
    @Pagination() pagination: PaginationDto,
    @Query('search') query?: string,
    @Query('limit', new ParseIntPipe()) limit?: string,
    @Query('sortBy')
    sortBy?: 'relevance' | 'views' | 'sales' | 'rating' | 'price' | 'recent'
  ): Promise<ProductListDto[]> {
    const maxLimit = limit ? Math.min(parseInt(limit), 50) : 20;
    return await this.productsService.searchProducts(
      query ?? '',
      maxLimit,
      undefined,
      {
        sortBy,
      }
    );
  }

  @Get('/:id')
  async getProductById(@Param('id') id: string): Promise<ProductDetailDto> {
    return this.productsService.findProductDetail(id);
  }
}
