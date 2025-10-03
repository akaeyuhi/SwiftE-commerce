import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DataSource, Repository } from 'typeorm';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';
import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import { REVIEWS_REPOSITORY } from 'src/common/contracts/reviews.contract';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  createMock,
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from '../../utils/helpers';
/* eslint-disable camelcase */

describe('AiPredictorService', () => {
  let service: AiPredictorService;
  let httpService: Partial<MockedMethods<HttpService>>;
  let predictorRepo: Partial<MockedMethods<AiPredictorRepository>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let storeStatsRepo: Partial<MockedMethods<StoreDailyStatsRepository>>;
  let productStatsRepo: Partial<MockedMethods<ProductDailyStatsRepository>>;
  let aiLogsService: Partial<MockedMethods<AiLogsService>>;
  let aiAuditService: Partial<MockedMethods<AiAuditService>>;
  let reviewsRepo: any;
  let variantRepo: Partial<MockedMethods<Repository<ProductVariant>>>;
  let inventoryRepo: Partial<MockedMethods<Repository<Inventory>>>;

  beforeEach(async () => {
    httpService = createMock<HttpService>(['post']);
    predictorRepo = createRepositoryMock<AiPredictorRepository>([
      'createEntity',
      'getTrendingProducts',
      'getPredictionStats',
    ]);

    storeStatsRepo = createRepositoryMock<StoreDailyStatsRepository>([
      'getAggregatedMetrics',
    ]);

    productStatsRepo = createRepositoryMock<ProductDailyStatsRepository>([
      'getAggregatedMetrics',
    ]);

    aiLogsService = createServiceMock<AiLogsService>(['record']);
    aiAuditService = createMock<AiAuditService>(['storeEncryptedResponse']);

    reviewsRepo = {
      getRatingAggregate: jest.fn(),
    };

    // Mock query builder for price and inventory stats
    const priceQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    const inventoryQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    variantRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(priceQueryBuilder),
    } as any;

    inventoryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(inventoryQueryBuilder),
    } as any;

    dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === ProductVariant) return variantRepo as any;
        if (entity === Inventory) return inventoryRepo as any;
        return {} as any;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiPredictorService,
        { provide: HttpService, useValue: httpService },
        { provide: AiPredictorRepository, useValue: predictorRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: StoreDailyStatsRepository, useValue: storeStatsRepo },
        { provide: ProductDailyStatsRepository, useValue: productStatsRepo },
        { provide: AiLogsService, useValue: aiLogsService },
        { provide: AiAuditService, useValue: aiAuditService },
        { provide: REVIEWS_REPOSITORY, useValue: reviewsRepo },
      ],
    }).compile();

    service = module.get<AiPredictorService>(AiPredictorService);

    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should validate request with items', () => {
      const request = {
        feature: 'prediction',
        provider: 'predictor',
        data: { items: ['p1', 'p2'] },
      };

      expect(() => (service as any).validateRequest(request)).not.toThrow();
    });

    it('should throw error for empty items', () => {
      const request = {
        feature: 'prediction',
        provider: 'predictor',
        data: { items: [] },
      };

      expect(() => (service as any).validateRequest(request)).toThrow(
        'Items array is required and cannot be empty'
      );
    });

    it('should throw error for too many items', () => {
      const request = {
        feature: 'prediction',
        provider: 'predictor',
        data: { items: Array(1001).fill('p1') },
      };

      expect(() => (service as any).validateRequest(request)).toThrow(
        'Cannot process more than 1000 items'
      );
    });

    it('should throw error for invalid item format', () => {
      const request = {
        feature: 'prediction',
        provider: 'predictor',
        data: { items: [{}] }, // No productId or features
      };

      expect(() => (service as any).validateRequest(request)).toThrow(
        'Each item must have either productId or pre-built features'
      );
    });
  });

  describe('buildFeatureVector', () => {
    beforeEach(() => {
      // Get the query builders from the repos
      const priceQueryBuilder = variantRepo.createQueryBuilder!();
      const inventoryQueryBuilder = inventoryRepo.createQueryBuilder!();

      // Setup default mocks
      productStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 100,
        purchases: 10,
        addToCarts: 25,
        revenue: 1000,
      });

      storeStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 500,
        purchases: 50,
        addToCarts: 125,
        revenue: 5000,
        checkouts: 60,
      });

      // Setup price query builder
      (priceQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        avg_price: '99.99',
        min_price: '79.99',
        max_price: '119.99',
      });

      // Setup inventory query builder
      (inventoryQueryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        inventory_qty: '50',
        last_updated_at: new Date('2025-01-01').toISOString(),
      });

      reviewsRepo.getRatingAggregate.mockResolvedValue({
        avg: 4.5,
        count: 100,
      });
    });

    it('should build feature vector successfully', async () => {
      const features = await service.buildFeatureVector('p1', 's1');

      expect(features).toBeDefined();
      expect(features.sales_7d).toBeGreaterThanOrEqual(0);
      expect(features.views_7d).toBeGreaterThanOrEqual(0);
      expect(features.avg_price).toBeCloseTo(99.99, 2);
      expect(features.avg_rating).toBe(4.5);
      expect(features.inventory_qty).toBe(50);
    });

    it('should cache feature vectors', async () => {
      await service.buildFeatureVector('p1', 's1');

      // Clear all mocks
      jest.clearAllMocks();

      await service.buildFeatureVector('p1', 's1');

      // Should not call stats again due to caching
      expect(productStatsRepo.getAggregatedMetrics).not.toHaveBeenCalled();
      expect(storeStatsRepo.getAggregatedMetrics).not.toHaveBeenCalled();
    });

    it('should handle missing store context', async () => {
      const features = await service.buildFeatureVector('p1');

      expect(features.store_views_7d).toBe(0);
      expect(features.store_purchases_7d).toBe(0);
    });

    it('should replace NaN values with 0', async () => {
      productStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 0,
        purchases: 0,
        addToCarts: 0,
        revenue: 0,
      });

      const features = await service.buildFeatureVector('p1');

      expect(features.view_to_purchase_7d).toBe(0);
      expect(features.sales_ratio_7_30).toBe(0);
    });

    it('should calculate temporal features', async () => {
      const features = await service.buildFeatureVector('p1');

      expect(features.day_of_week).toBeGreaterThanOrEqual(0);
      expect(features.day_of_week).toBeLessThanOrEqual(6);
      expect([0, 1]).toContain(features.is_weekend);
    });

    it('should handle missing price data', async () => {
      const priceQueryBuilder = variantRepo.createQueryBuilder!();
      (priceQueryBuilder.getRawOne as jest.Mock)!.mockResolvedValue(null);

      const features = await service.buildFeatureVector('p1', 's1');

      expect(features.avg_price).toBe(0);
      expect(features.min_price).toBe(0);
      expect(features.max_price).toBe(0);
    });

    it('should handle missing inventory data', async () => {
      const inventoryQueryBuilder = inventoryRepo.createQueryBuilder!();
      (inventoryQueryBuilder.getRawOne as jest.Mock).mockResolvedValue(null);

      const features = await service.buildFeatureVector('p1', 's1');

      expect(features.inventory_qty).toBe(0);
      expect(features.days_since_restock).toBe(365);
    });

    it('should handle missing reviews', async () => {
      reviewsRepo.getRatingAggregate.mockResolvedValue(null);

      const features = await service.buildFeatureVector('p1', 's1');

      expect(features.avg_rating).toBe(0);
      expect(features.rating_count).toBe(0);
    });
  });

  describe('predictBatch', () => {
    beforeEach(() => {
      // Mock feature building
      jest.spyOn(service, 'buildFeatureVector').mockResolvedValue({
        sales_7d: 10,
        sales_14d: 20,
        sales_30d: 30,
        views_7d: 100,
        avg_price: 99.99,
      } as any);

      // Mock HTTP response
      const mockResponse: AxiosResponse = {
        data: {
          results: [
            { score: 0.85, label: 'high' },
            { score: 0.65, label: 'medium' },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post!.mockReturnValue(of(mockResponse) as any);
      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue(
        undefined as any
      );
    });

    it('should predict batch of products', async () => {
      const items = ['p1', 'p2'];

      const results = await service.predictBatch(items);

      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(0.85);
      expect(results[0].label).toBe('high');
      expect(results[1].score).toBe(0.65);
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should handle items with productId and storeId', async () => {
      const items = [
        { productId: 'p1', storeId: 's1' },
        { productId: 'p2', storeId: 's1' },
      ];

      const results = await service.predictBatch(items);

      expect(results).toHaveLength(2);
      expect(results[0].productId).toBe('p1');
      expect(results[0].storeId).toBe('s1');
    });

    it('should handle items with pre-built features', async () => {
      const items = [
        {
          productId: 'p1',
          storeId: 's1',
          features: { sales_7d: 15, views_7d: 150 } as any,
        },
      ];

      const results = await service.predictBatch(items);

      expect(results).toHaveLength(1);
      expect(service.buildFeatureVector).not.toHaveBeenCalled();
    });

    it('should return empty array for empty items', async () => {
      const results = await service.predictBatch([]);

      expect(results).toEqual([]);
    });

    it('should handle feature building errors', async () => {
      jest
        .spyOn(service, 'buildFeatureVector')
        .mockRejectedValue(new Error('Feature build failed'));

      const results = await service.predictBatch(['p1']);

      expect(results).toHaveLength(1);
      expect(results[0].error).toContain('feature_build_error');
    });

    it('should handle HTTP errors', async () => {
      httpService.post!.mockReturnValue(
        throwError(() => new Error('Service unavailable')) as any
      );

      const results = await service.predictBatch(['p1', 'p2']);

      expect(results).toHaveLength(2);
      expect(results[0].error).toContain('predictor_call_error');
    });

    it('should process in chunks', async () => {
      // Set small chunk size for testing
      (service as any).chunkSize = 2;

      const items = ['p1', 'p2', 'p3', 'p4', 'p5'];

      await service.predictBatch(items);

      // Should make 3 HTTP calls (2+2+1)
      expect(httpService.post).toHaveBeenCalledTimes(3);
    });

    it('should normalize scores to 0-1 range', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          results: [
            { score: 1.5 }, // Above 1
            { score: -0.5 }, // Below 0
            { score: 0.5 }, // Valid
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post!.mockReturnValue(of(mockResponse) as any);

      const results = await service.predictBatch(['p1', 'p2', 'p3']);

      expect(results[0].score).toBe(1); // Capped at 1
      expect(results[1].score).toBe(0); // Capped at 0
      expect(results[2].score).toBe(0.5); // Unchanged
    });
  });

  describe('predictBatchAndPersist', () => {
    beforeEach(() => {
      jest.spyOn(service, 'predictBatch').mockResolvedValue([
        {
          index: 0,
          score: 0.85,
          label: 'high',
          productId: 'p1',
          storeId: 's1',
          features: {} as any,
          rawPrediction: { score: 0.85 },
        },
        {
          index: 1,
          score: NaN,
          label: 'error',
          productId: 'p2',
          storeId: 's1',
          features: {} as any,
          rawPrediction: null,
          error: 'prediction_failed',
        },
      ]);

      predictorRepo.createEntity!.mockResolvedValue({
        id: 'stat1',
        prediction: { score: 0.85 },
      } as any);
    });

    it('should persist successful predictions', async () => {
      const items = ['p1', 'p2'];

      const results = await service.predictBatchAndPersist(items, 'v1.0');

      expect(results).toHaveLength(1); // Only successful prediction
      expect(results[0].predictorStat.id).toBe('stat1');
      expect(predictorRepo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          modelVersion: 'v1.0',
          productId: 'p1',
        })
      );
    });

    it('should skip predictions with errors', async () => {
      const items = ['p1', 'p2'];

      const results = await service.predictBatchAndPersist(items);

      expect(results).toHaveLength(1);
      expect(predictorRepo.createEntity).toHaveBeenCalledTimes(1);
    });

    it('should handle persistence errors gracefully', async () => {
      predictorRepo.createEntity!.mockRejectedValue(new Error('DB error'));

      const results = await service.predictBatchAndPersist(['p1']);

      expect(results).toEqual([]);
    });
  });

  describe('getTrendingProducts', () => {
    it('should get trending products', async () => {
      const trending = [
        { productId: 'p1', score: 0.9, trend: 'up' },
        { productId: 'p2', score: 0.85, trend: 'stable' },
      ];

      predictorRepo.getTrendingProducts!.mockResolvedValue(trending as any);

      const result = await service.getTrendingProducts('s1', {
        limit: 10,
        timeframe: 'week',
        minScore: 0.7,
      });

      expect(result).toEqual(trending);
      expect(predictorRepo.getTrendingProducts).toHaveBeenCalledWith('s1', {
        limit: 10,
        timeframe: 'week',
        minScore: 0.7,
      });
    });
  });

  describe('getPredictionStats', () => {
    it('should get prediction statistics', async () => {
      const stats = {
        totalPredictions: 100,
        averageScore: 0.75,
        byModelVersion: { 'v1.0': 100 },
      };

      predictorRepo.getPredictionStats!.mockResolvedValue(stats as any);

      const result = await service.getPredictionStats({
        storeId: 's1',
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-31'),
      });

      expect(result).toEqual(stats);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockResponse: AxiosResponse = {
        data: { results: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post!.mockReturnValue(of(mockResponse) as any);

      const health = await service.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.status).toBe(200);
    });

    it('should return unhealthy status on error', async () => {
      httpService.post!.mockReturnValue(
        throwError(() => new Error('Connection timeout')) as any
      );

      const health = await service.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Connection timeout');
    });
  });

  describe('processRequest', () => {
    beforeEach(() => {
      jest.spyOn(service, 'buildFeatureVector').mockResolvedValue({
        sales_7d: 10,
        views_7d: 100,
      } as any);

      const mockResponse: AxiosResponse = {
        data: { results: [{ score: 0.8 }] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post!.mockReturnValue(of(mockResponse) as any);
      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue(
        undefined as any
      );
    });

    it('should process request successfully', async () => {
      const request = {
        feature: 'prediction',
        provider: 'predictor',
        data: { items: ['p1'] },
        userId: 'u1',
        storeId: 's1',
      };

      const response = await (service as any).processRequest(request);

      expect(response.success).toBe(true);
      expect(response.result.predictions).toHaveLength(1);
      expect(response.feature).toBe('prediction');
    });

    it('should include processing time', async () => {
      const request = {
        feature: 'prediction',
        provider: 'predictor',
        data: { items: ['p1'] },
      };

      const response = await (service as any).processRequest(request);

      expect(response.result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cache management', () => {
    it('should cleanup old cache entries', async () => {
      // Fill cache with 1100 entries to trigger cleanup
      for (let i = 0; i < 1100; i++) {
        (service as any).featureCache.set(`p${i}:s1`, {
          features: {},
          timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes old
        });
      }

      productStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 100,
        purchases: 10,
        addToCarts: 25,
        revenue: 1000,
      });

      const priceQueryBuilder = variantRepo.createQueryBuilder!() as any;
      priceQueryBuilder.getRawOne.mockResolvedValue({
        avg_price: '99.99',
      });

      const inventoryQueryBuilder = inventoryRepo.createQueryBuilder!() as any;
      inventoryQueryBuilder.getRawOne.mockResolvedValue({
        inventory_qty: '50',
      });

      reviewsRepo.getRatingAggregate.mockResolvedValue({
        avg: 4.5,
        count: 100,
      });

      await service.buildFeatureVector('new-product', 's1');

      // Cache should have been cleaned up
      expect((service as any).featureCache.size).toBeLessThan(1100);
    });
  });
});
