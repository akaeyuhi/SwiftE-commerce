// src/modules/store/store.controller.ts
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoreDto, StoreListDto, StoreStatsDto } from './dto/store.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Store } from 'src/entities/store/store.entity';
import { StoreRole } from 'src/common/decorators/store-role.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

/**
 * StoreController
 *
 * Manages store operations including:
 * - CRUD operations
 * - Quick statistics (cached values)
 * - Store rankings and leaderboards
 * - Data integrity operations
 */
@Controller('stores')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class StoreController extends BaseController<
  Store,
  CreateStoreDto,
  UpdateStoreDto,
  StoreDto
> {
  constructor(private readonly storeService: StoreService) {
    super(storeService);
  }

  // ===============================
  // Store Listings & Discovery
  // ===============================

  /**
   * GET /stores
   * List all stores with cached statistics (lightweight)
   *
   * @returns Array of stores with productCount, followerCount, revenue, etc.
   */
  @Get()
  async findAllStores(): Promise<StoreListDto[]> {
    try {
      return await this.storeService.findAllWithStats();
    } catch (error) {
      throw new BadRequestException(`Failed to fetch stores: ${error.message}`);
    }
  }

  /**
   * GET /stores/search
   * Search stores by name (with stats)
   *
   * @param query - search term
   * @param limit - max results
   */
  @Get('search')
  async searchStores(
    @Query('q') query: string,
    @Query('limit') limit?: string
  ): Promise<StoreListDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 20;
      return await this.storeService.searchStoresByName(query, maxLimit);
    } catch (error) {
      throw new BadRequestException(
        `Failed to search stores: ${error.message}`
      );
    }
  }

  // ===============================
  // Store Statistics & Analytics
  // ===============================

  /**
   * GET /stores/:id/stats
   * Get detailed statistics for a specific store
   *
   * Includes: productCount, followerCount, orderCount, totalRevenue, averageOrderValue
   */
  @Get(':id/stats')
  async getStoreStats(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<StoreStatsDto> {
    try {
      return await this.storeService.getStoreStats(id);
    } catch (error) {
      throw new BadRequestException(
        `Failed to get store stats: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/:id/quick-stats
   * Alias for stats endpoint (consistent with analytics API)
   */
  @Get(':id/quick-stats')
  async getQuickStats(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<StoreStatsDto> {
    return this.getStoreStats(id);
  }

  // ===============================
  // Leaderboards & Rankings
  // ===============================

  /**
   * GET /stores/top/revenue
   * Get top stores by total revenue
   *
   * @param limit - number of stores to return (default: 10, max: 50)
   */
  @Get('top/revenue')
  async getTopStoresByRevenue(
    @Query('limit') limit?: string
  ): Promise<StoreStatsDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
      return await this.storeService.getTopStoresByRevenue(maxLimit);
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top stores: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/top/products
   * Get top stores by product count
   *
   * @param limit - number of stores to return
   */
  @Get('top/products')
  async getTopStoresByProducts(
    @Query('limit') limit?: string
  ): Promise<StoreStatsDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
      return await this.storeService.getTopStoresByProducts(maxLimit);
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top stores: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/top/followers
   * Get top stores by follower count
   */
  @Get('top/followers')
  async getTopStoresByFollowers(
    @Query('limit') limit?: string
  ): Promise<StoreStatsDto[]> {
    try {
      const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
      return await this.storeService.getTopStoresByFollowers(maxLimit);
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top stores: ${error.message}`
      );
    }
  }

  // ===============================
  // Admin Operations
  // ===============================

  /**
   * POST /stores/:id/recalculate-stats
   * Manually recalculate all cached statistics for a store
   *
   * Admin only - use this for data integrity checks or after migrations
   */
  @Post(':id/recalculate-stats')
  @AdminRole(AdminRoles.ADMIN)
  @StoreRole(StoreRoles.ADMIN)
  @HttpCode(HttpStatus.OK)
  async recalculateStats(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.storeService.recalculateStoreStats(id);
      return {
        success: true,
        message: 'Store statistics recalculated successfully',
        storeId: id,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to recalculate stats: ${error.message}`
      );
    }
  }

  /**
   * POST /stores/recalculate-all-stats
   * Recalculate statistics for all stores
   *
   * Admin only - heavy operation, use with caution
   */
  @Post('recalculate-all-stats')
  @AdminRole(AdminRoles.ADMIN)
  @HttpCode(HttpStatus.OK)
  async recalculateAllStats() {
    try {
      await this.storeService.recalculateAllStoreStats();
      return {
        success: true,
        message: 'All store statistics recalculated successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to recalculate stats: ${error.message}`
      );
    }
  }

  /**
   * GET /stores/:id/health
   * Check store data health and integrity
   */
  @Get(':id/health')
  @AdminRole(AdminRoles.ADMIN)
  @StoreRole(StoreRoles.ADMIN)
  async checkStoreHealth(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.storeService.checkStoreDataHealth(id);
    } catch (error) {
      throw new BadRequestException(
        `Failed to check store health: ${error.message}`
      );
    }
  }
}
