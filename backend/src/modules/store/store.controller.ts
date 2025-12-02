import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import {
  StoreDto,
  StoreListDto,
  StoreSearchResultDto,
  StoreStatsDto,
} from './dto/store.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Store } from 'src/entities/store/store.entity';
import { StoreRole } from 'src/common/decorators/store-role.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdvancedStoreSearchDto } from 'src/modules/store/dto/advanced-store-search.dto';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import { PaginatedResponse } from 'src/common/decorators/paginated-response.decorator';
import { UploadStoreFiles } from 'src/common/decorators/upload-store-files.decorator';
import { RecordEvents } from 'src/common/decorators/record-event.decorator';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';

/**
 * StoreController
 *
 * Manages store operations including:
 * - CRUD operations
 * - Quick statistics (cached values)
 * - Store rankings and leaderboards
 * - Advanced search and autocomplete
 * - Data integrity operations
 */
@Controller('stores')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
@UseInterceptors(RecordEventInterceptor)
@RecordEvents({
  findOne: {
    eventType: AnalyticsEventType.VIEW,
    storeId: 'params.storeId',
    userId: 'user.id',
    invokedOn: 'store',
    when: 'after',
  },
})
export class StoreController extends BaseController<
  Store,
  CreateStoreDto,
  UpdateStoreDto,
  StoreDto
> {
  static accessPolicies: AccessPolicies = {
    findAll: { requireAuthenticated: true, adminRole: AdminRoles.ADMIN },
    findOne: { requireAuthenticated: true, adminRole: undefined },
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

  constructor(private readonly storeService: StoreService) {
    super(storeService);
  }

  @Post(':id/upload-files')
  @UploadStoreFiles()
  @StoreRole(StoreRoles.ADMIN)
  async uploadFiles(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] }
  ): Promise<StoreDto> {
    const logoFile = files.logo ? files.logo[0] : undefined;
    const bannerFile = files.banner ? files.banner[0] : undefined;
    return this.storeService.uploadFiles(id, logoFile, bannerFile);
  }

  // ===============================
  // Store Listings & Discovery
  // ===============================

  /**
   * GET /stores
   * List all stores with cached statistics (lightweight)
   */
  @Get()
  async findAllStores(): Promise<StoreListDto[]> {
    try {
      return await this.storeService.findAllWithStats();
    } catch (error) {
      throw new BadRequestException(`Failed to fetch stores: ${error.message}`);
    }
  }

  @Get(':id/team')
  async findOneWithTeam(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Store | null> {
    return this.storeService.findOneWithTeam(id);
  }

  /**
   * GET /stores/search
   * Basic search stores by name with stats
   *
   * @param query - search term (required)
   * @param limit - max results (default: 20, max: 50)
   * @param sortBy - sort option
   */
  @Get('search')
  async searchStores(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('sortBy')
    sortBy?: 'followers' | 'revenue' | 'products' | 'recent'
  ): Promise<StoreSearchResultDto[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const maxLimit = limit ? Math.min(parseInt(limit), 50) : 20;
    return await this.storeService.searchStoresByName(query, maxLimit, {
      sortBy,
    });
  }

  /**
   * POST /stores/advanced-search
   * Advanced store search with comprehensive filters
   *
   * @example
   * POST /stores/advanced-search
   * Body: {
   *   "query": "tech",
   *   "minRevenue": 10000,
   *   "maxRevenue": 100000,
   *   "minProducts": 10,
   *   "minFollowers": 100,
   *   "sortBy": "revenue",
   *   "sortOrder": "DESC",
   *   "limit": 20,
   *   "offset": 0
   * }
   */
  @Post('advanced-search')
  @PaginatedResponse(StoreSearchResultDto)
  @HttpCode(HttpStatus.OK)
  async advancedSearch(@Query() searchDto: AdvancedStoreSearchDto) {
    return this.storeService.paginate(searchDto);
  }

  /**
   * GET /stores/autocomplete
   * Get autocomplete suggestions for store search
   *
   * @example
   * GET /stores/autocomplete?q=tech&limit=10
   *
   * Response:
   * [
   *   {
   *     "id": "store-1",
   *     "name": "Tech Store",
   *     "followerCount": 1523
   *   },
   *   ...
   * ]
   */
  @Get('autocomplete')
  async autocomplete(
    @Query('q') query: string,
    @Query('limit') limit?: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      followerCount: number;
    }>
  > {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const maxLimit = limit ? Math.min(parseInt(limit), 20) : 10;
    return await this.storeService.autocompleteStores(query.trim(), maxLimit);
  }
  // ===============================
  // Store Statistics & Analytics
  // ===============================

  /**
   * GET /stores/:id/stats
   * Get detailed statistics for a specific store
   */
  @Get(':id/stats')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async getStoreStats(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<StoreStatsDto> {
    return await this.storeService.getStoreStats(id);
  }

  /**
   * GET /stores/:id/quick-stats
   * Alias for stats endpoint (consistent with analytics API)
   */
  @Get(':id/quick-stats')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async getQuickStats(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<StoreStatsDto> {
    return this.getStoreStats(id);
  }

  @Get(':id/overview')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async getStoreOverview(@Param('id', ParseUUIDPipe) id: string) {
    return this.storeService.getStoreOverview(id);
  }

  @Get(':id/recent-orders')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async getRecentOrders(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit: number
  ) {
    return this.storeService.getRecentOrders(id, limit);
  }

  // ===============================
  // Leaderboards & Rankings
  // ===============================

  /**
   * GET /stores/top/revenue
   * Get top stores by total revenue
   */
  @Get('top/revenue')
  async getTopStoresByRevenue(
    @Query('limit') limit?: string
  ): Promise<StoreStatsDto[]> {
    const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
    return await this.storeService.getTopStoresByRevenue(maxLimit);
  }

  /**
   * GET /stores/top/products
   * Get top stores by product count
   */
  @Get('top/products')
  async getTopStoresByProducts(
    @Query('limit') limit?: string
  ): Promise<StoreStatsDto[]> {
    const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
    return await this.storeService.getTopStoresByProducts(maxLimit);
  }

  /**
   * GET /stores/top/followers
   * Get top stores by follower count
   */
  @Get('top/followers')
  async getTopStoresByFollowers(
    @Query('limit') limit?: string
  ): Promise<StoreStatsDto[]> {
    const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10;
    return await this.storeService.getTopStoresByFollowers(maxLimit);
  }

  // ===============================
  // Admin Operations
  // ===============================

  /**
   * POST /stores/:id/recalculate-stats
   * Manually recalculate all cached statistics for a store
   */
  @Post(':id/recalculate-stats')
  @StoreRole(StoreRoles.ADMIN)
  @HttpCode(HttpStatus.OK)
  async recalculateStats(@Param('id', ParseUUIDPipe) id: string) {
    await this.storeService.recalculateStoreStats(id);
    return {
      success: true,
      message: 'Store statistics recalculated successfully',
      storeId: id,
    };
  }

  /**
   * POST /stores/recalculate-all-stats
   * Recalculate statistics for all stores (heavy operation)
   */
  @Post('recalculate-all-stats')
  @AdminRole(AdminRoles.ADMIN)
  @HttpCode(HttpStatus.OK)
  async recalculateAllStats() {
    await this.storeService.recalculateAllStoreStats();
    return {
      success: true,
      message: 'All store statistics recalculated successfully',
    };
  }

  /**
   * GET /stores/:id/health
   * Check store data health and integrity
   */
  @Get(':id/health')
  @StoreRole(StoreRoles.ADMIN)
  async checkStoreHealth(@Param('id', ParseUUIDPipe) id: string) {
    return await this.storeService.checkStoreDataHealth(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto
  ): Promise<StoreDto> {
    return this.storeService.update(id, dto);
  }

  /**
   * DELETE /stores/:storeId/
   * Soft delete a store
   */
  @Delete(':id/soft')
  @StoreRole(StoreRoles.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    await this.storeService.softDelete(id);
    return { success: true };
  }
}
