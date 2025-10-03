import { Test, TestingModule } from '@nestjs/testing';
import { AiPredictorController } from 'src/modules/ai/ai-predictor/ai-predictor.controller';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import { NotFoundException } from '@nestjs/common';
import {
  SinglePredictDto,
  BatchPredictDto,
  TrendingQueryDto,
  PredictionQueryDto,
  BuildFeatureVectorDto,
} from 'src/modules/ai/ai-predictor/dto/predictor-request.dto';
import {
  createGuardMock,
  createMock,
  createPolicyMock,
  MockedMethods,
} from '../../utils/helpers';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';

describe('AiPredictorController', () => {
  let controller: AiPredictorController;
  let predictorService: Partial<MockedMethods<AiPredictorService>>;

  const mockUser = { id: 'u1', storeId: 's1' };
  const mockRequest = { user: mockUser } as any;

  beforeEach(async () => {
    const guardMock = createGuardMock();
    const policyMock = createPolicyMock();

    predictorService = createMock<AiPredictorService>([
      'buildFeatureVector',
      'predictBatch',
      'predictBatchAndPersist',
      'getTrendingProducts',
      'getPredictionStats',
      'healthCheck',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiPredictorController],
      providers: [
        { provide: PolicyService, useValue: policyMock },
        { provide: AiPredictorService, useValue: predictorService },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
        { provide: EntityOwnerGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<AiPredictorController>(AiPredictorController);

    jest.clearAllMocks();
  });

  describe('buildFeatureVector', () => {
    it('should build feature vector successfully', async () => {
      const query: BuildFeatureVectorDto = { storeId: 's1' };
      const features = { price: 99.99, views: 100, sales: 10 } as any;

      predictorService.buildFeatureVector!.mockResolvedValue(features);

      const result = await controller.buildFeatureVector(
        'p1',
        query,
        mockRequest
      );

      expect(result.success).toBe(true);
      expect(result.data.features).toEqual(features);
      expect(result.data.productId).toBe('p1');
      expect(predictorService.buildFeatureVector).toHaveBeenCalledWith(
        'p1',
        's1'
      );
    });

    it('should throw BadRequestException on error', async () => {
      const query: BuildFeatureVectorDto = {};

      predictorService.buildFeatureVector!.mockRejectedValue(
        new Error('Build error')
      );

      await expect(
        controller.buildFeatureVector('p1', query, mockRequest)
      ).rejects.toThrow('Failed to build feature vector');
    });
  });

  describe('predictSingle', () => {
    it('should predict with productId', async () => {
      const dto: SinglePredictDto = {
        productId: 'p1',
        storeId: 's1',
      };

      const prediction = { score: 0.85, confidence: 0.9 } as any;
      predictorService.predictBatch!.mockResolvedValue([prediction]);

      const result = await controller.predictSingle(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.prediction).toEqual(prediction);
    });

    it('should predict with features only', async () => {
      const dto: SinglePredictDto = {
        features: { price: 99.99, views: 100 },
        storeId: 's1',
      };

      const prediction = { score: 0.75 } as any;
      predictorService.predictBatch!.mockResolvedValue([prediction]);

      const result = await controller.predictSingle(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.prediction).toEqual(prediction);
    });

    it('should throw BadRequestException when no productId or features', async () => {
      const dto: SinglePredictDto = {
        storeId: 's1',
      };

      await expect(controller.predictSingle(dto, mockRequest)).rejects.toThrow(
        'Either productId or features must be provided'
      );
    });

    it('should throw NotFoundException when no prediction generated', async () => {
      const dto: SinglePredictDto = {
        productId: 'p1',
        storeId: 's1',
      };

      predictorService.predictBatch!.mockResolvedValue([]);

      await expect(controller.predictSingle(dto, mockRequest)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('predictBatch', () => {
    it('should predict batch without persistence', async () => {
      const dto: BatchPredictDto = {
        items: [
          { productId: 'p1', storeId: 's1' },
          { productId: 'p2', storeId: 's1' },
        ],
        persist: false,
      };

      const predictions = [{ score: 0.8 }, { score: 0.9 }] as any;
      predictorService.predictBatch!.mockResolvedValue(predictions);

      const result = await controller.predictBatch(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.results).toEqual(predictions);
      expect(result.data.metadata.persisted).toBe(false);
    });

    it('should predict batch with persistence', async () => {
      const dto: BatchPredictDto = {
        items: [{ productId: 'p1', storeId: 's1' }],
        persist: true,
        modelVersion: 'v1.0',
      };

      const persisted = [
        {
          predictorStat: { id: 'stat1' },
          prediction: { score: 0.85 },
        },
      ];

      predictorService.predictBatchAndPersist!.mockResolvedValue(
        persisted as any
      );

      const result = await controller.predictBatch(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.results[0].predictorStatId).toBe('stat1');
      expect(result.data.metadata.persisted).toBe(true);
    });

    it('should return empty results for empty items', async () => {
      const dto: BatchPredictDto = {
        items: [],
      };

      const result = await controller.predictBatch(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.results).toEqual([]);
      expect(result.data.metadata.count).toBe(0);
    });

    it('should throw BadRequestException for too many items', async () => {
      const items = Array.from({ length: 1001 }, (_, i) => ({
        productId: `p${i}`,
        storeId: 's1',
      }));

      const dto: BatchPredictDto = { items };

      await expect(controller.predictBatch(dto, mockRequest)).rejects.toThrow(
        'Cannot process more than 1000 items'
      );
    });
  });

  describe('getTrendingProducts', () => {
    it('should get trending products', async () => {
      const query: TrendingQueryDto = {
        limit: 10,
        timeframe: 'week',
        minScore: 0.7,
      };

      const trending = [
        { productId: 'p1', score: 0.9, trend: 'up' },
        { productId: 'p2', score: 0.85, trend: 'stable' },
      ];

      predictorService.getTrendingProducts!.mockResolvedValue(trending as any);

      const result = await controller.getTrendingProducts(
        's1',
        query,
        mockRequest
      );

      expect(result.success).toBe(true);
      expect(result.data.trending).toEqual(trending);
      expect(result.data.metadata.timeframe).toBe('week');
    });

    it('should use default query values', async () => {
      const query: TrendingQueryDto = {};

      predictorService.getTrendingProducts!.mockResolvedValue([]);

      await controller.getTrendingProducts('s1', query, mockRequest);

      expect(predictorService.getTrendingProducts).toHaveBeenCalledWith('s1', {
        limit: 10,
        timeframe: 'week',
        minScore: 0.6,
      });
    });
  });

  describe('getPredictionStats', () => {
    it('should get prediction statistics', async () => {
      const query: PredictionQueryDto = {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
        modelVersion: 'v1.0',
      };

      const stats = {
        totalPredictions: 100,
        averageScore: 0.8,
      } as any;

      predictorService.getPredictionStats!.mockResolvedValue(stats);

      const result = await controller.getPredictionStats(
        's1',
        query,
        mockRequest
      );

      expect(result.success).toBe(true);
      expect(result.data.stats).toEqual(stats);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = {
        healthy: true,
        modelLoaded: true,
      } as any;

      predictorService.healthCheck!.mockResolvedValue(health);

      const result = await controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.healthy).toBe(true);
      expect(result.data.service).toBe('ai-predictor');
    });

    it('should return unhealthy status on error', async () => {
      predictorService.healthCheck!.mockRejectedValue(new Error('Model error'));

      const result = await controller.healthCheck();

      expect(result.success).toBe(false);
      expect(result.data.error).toBe('Model error');
    });
  });

  describe('getModelComparison', () => {
    it('should get model comparison', async () => {
      const query: PredictionQueryDto = {};
      const comparison = {
        totalPredictions: 1000,
        byModelVersion: { 'v1.0': 500, 'v2.0': 500 },
      } as any;

      predictorService.getPredictionStats!.mockResolvedValue(comparison);

      const result = await controller.getModelComparison(query);

      expect(result.success).toBe(true);
      expect(result.data.comparison).toEqual(comparison);
    });
  });

  describe('extractUser', () => {
    it('should extract user from request', () => {
      const user = (controller as any).extractUser(mockRequest);

      expect(user.id).toBe('u1');
      expect(user.storeId).toBe('s1');
    });

    it('should throw BadRequestException when user not found', () => {
      const emptyRequest = { user: null } as any;

      expect(() => (controller as any).extractUser(emptyRequest)).toThrow(
        'User context not found'
      );
    });
  });
});
