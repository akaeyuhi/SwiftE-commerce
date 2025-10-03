import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsController } from 'src/modules/analytics/controllers/admin-stats.controller';
import { AnalyticsService } from 'src/modules/analytics/analytics.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { GetStatsDto } from 'src/modules/analytics/dto/get-stats.dto';
import {
  createGuardMock,
  createMock,
  MockedMethods,
} from '../../utils/helpers';

describe('AdminStatsController', () => {
  let controller: AdminStatsController;
  let analyticsService: Partial<MockedMethods<AnalyticsService>>;

  beforeEach(async () => {
    const guardMock = createGuardMock();

    analyticsService = createMock<AnalyticsService>([
      'computeStoreConversion',
      'computeProductConversion',
      'getTopProductsByConversion',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatsController],
      providers: [
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<AdminStatsController>(AdminStatsController);

    jest.clearAllMocks();
  });

  describe('getStoreSummary', () => {
    it('should return store summary metrics', async () => {
      const storeId = 's1';
      const query: GetStatsDto = {
        from: '2025-01-01',
        to: '2025-01-31',
      };

      const metrics = {
        views: 1000,
        purchases: 100,
        revenue: 10000,
        conversionRate: 0.1,
      } as unknown as ReturnType<
        typeof AnalyticsService.prototype.computeStoreConversion
      >;

      analyticsService.computeStoreConversion!.mockResolvedValue(metrics);

      const result = await controller.getStoreSummary(storeId, query);

      expect(analyticsService.computeStoreConversion).toHaveBeenCalledWith(
        storeId,
        query.from,
        query.to
      );
      expect(result).toEqual(metrics);
    });

    it('should handle queries without date range', async () => {
      const storeId = 's1';
      const query: GetStatsDto = {};

      analyticsService.computeStoreConversion!.mockResolvedValue({} as any);

      await controller.getStoreSummary(storeId, query);

      expect(analyticsService.computeStoreConversion).toHaveBeenCalledWith(
        storeId,
        undefined,
        undefined
      );
    });
  });

  describe('getProductMetrics', () => {
    it('should return product metrics', async () => {
      const storeId = 's1';
      const productId = 'p1';
      const query: GetStatsDto = {
        from: '2025-01-01',
        to: '2025-01-31',
      };

      const metrics = {
        views: 200,
        purchases: 20,
        revenue: 2000,
        conversionRate: 0.1,
      } as unknown as ReturnType<
        typeof AnalyticsService.prototype.computeProductConversion
      >;

      analyticsService.computeProductConversion!.mockResolvedValue(metrics);

      const result = await controller.getProductMetrics(
        storeId,
        productId,
        query
      );

      expect(analyticsService.computeProductConversion).toHaveBeenCalledWith(
        productId,
        query.from,
        query.to
      );
      expect(result).toEqual(metrics);
    });

    it('should not use storeId parameter (marked as unused)', async () => {
      const storeId = 's1';
      const productId = 'p1';
      const query: GetStatsDto = {};

      analyticsService.computeProductConversion!.mockResolvedValue({} as any);

      await controller.getProductMetrics(storeId, productId, query);

      // Verify productId is used, not storeId
      expect(analyticsService.computeProductConversion).toHaveBeenCalledWith(
        productId,
        undefined,
        undefined
      );
    });
  });

  describe('getTopProducts', () => {
    it('should return top products with default limit', async () => {
      const storeId = 's1';
      const query: GetStatsDto = {
        from: '2025-01-01',
        to: '2025-01-31',
      };

      const topProducts = [
        { productId: 'p1', conversionRate: 0.2, views: 100, purchases: 20 },
        { productId: 'p2', conversionRate: 0.15, views: 200, purchases: 30 },
      ];

      analyticsService.getTopProductsByConversion!.mockResolvedValue(
        topProducts as any
      );

      const result = await controller.getTopProducts(storeId, query);

      expect(analyticsService.getTopProductsByConversion).toHaveBeenCalledWith(
        storeId,
        query.from,
        query.to,
        10 // default limit
      );
      expect(result).toEqual(topProducts);
    });

    it('should use custom limit when provided', async () => {
      const storeId = 's1';
      const query: GetStatsDto & { limit?: string } = {
        from: '2025-01-01',
        to: '2025-01-31',
        limit: '5',
      };

      analyticsService.getTopProductsByConversion!.mockResolvedValue([]);

      await controller.getTopProducts(storeId, query);

      expect(analyticsService.getTopProductsByConversion).toHaveBeenCalledWith(
        storeId,
        query.from,
        query.to,
        5
      );
    });

    it('should handle string limit conversion', async () => {
      const storeId = 's1';
      const query: any = { limit: '25' };

      analyticsService.getTopProductsByConversion!.mockResolvedValue([]);

      await controller.getTopProducts(storeId, query);

      expect(analyticsService.getTopProductsByConversion).toHaveBeenCalledWith(
        storeId,
        undefined,
        undefined,
        25
      );
    });
  });

  describe('error handling', () => {
    it('should propagate service errors', async () => {
      const storeId = 's1';
      const query: GetStatsDto = {};

      analyticsService.computeStoreConversion!.mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.getStoreSummary(storeId, query)).rejects.toThrow(
        'Service error'
      );
    });
  });
});
