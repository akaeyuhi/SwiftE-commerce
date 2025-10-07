import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { ProductsRankingService } from 'src/modules/products/services/product-ranking.service';
import { ProductListDto } from '../dto/product.dto';

@Controller('stores/:storeId/products')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class ProductsRankingController {
  constructor(
    private readonly productsRankingService: ProductsRankingService
  ) {}

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
      return await this.productsRankingService.getTopProductsByViews(
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
      return await this.productsRankingService.getTopProductsBySales(
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
      return await this.productsRankingService.getTopRatedProducts(
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
      return await this.productsRankingService.getTopProductsByConversionRate(
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
      return await this.productsRankingService.getTrendingProducts(
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
}
