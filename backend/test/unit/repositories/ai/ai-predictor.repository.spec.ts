import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { AiPredictorStat } from 'src/entities/ai/ai-predictor-stat.entity';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from '../../utils/helpers';
import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';

describe('AiPredictorRepository', () => {
  let repo: AiPredictorRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<AiPredictorStat>>>;

  const mockPrediction: AiPredictorStat = {
    id: 'p1',
    scope: 'product',
    productId: 'product1',
    storeId: 's1',
    modelVersion: 'v1.0',
    prediction: { score: 0.85, confidence: 0.9 },
    createdAt: new Date('2025-01-15'),
  } as AiPredictorStat;

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
      execute: jest.fn(),
    } as any;

    manager = createMockEntityManager();
    manager.createQueryBuilder!.mockReturnValue(queryBuilder as any);

    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(manager as any);

    repo = new AiPredictorRepository(dataSource as any);

    jest.clearAllMocks();
  });

  describe('getProductPredictions', () => {
    it('should get predictions for a product', async () => {
      const predictions = [mockPrediction];
      queryBuilder.getMany!.mockResolvedValue(predictions);

      const result = await repo.getProductPredictions('product1', {
        limit: 10,
      });

      expect(result).toEqual(predictions);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'stat.productId = :productId',
        { productId: 'product1' }
      );
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getStorePredictions', () => {
    it('should get predictions for a store', async () => {
      const predictions = [mockPrediction];
      queryBuilder.getMany!.mockResolvedValue(predictions);

      const result = await repo.getStorePredictions('s1', { limit: 20 });

      expect(result).toEqual(predictions);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'stat.storeId = :storeId',
        {
          storeId: 's1',
        }
      );
    });
  });

  describe('getHighScoringPredictions', () => {
    it('should get high-scoring predictions', async () => {
      const predictions = [mockPrediction];
      queryBuilder.getMany!.mockResolvedValue(predictions);

      const result = await repo.getHighScoringPredictions({
        minScore: 0.8,
        storeId: 's1',
      });

      expect(result).toEqual(predictions);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        `(stat.prediction->>'score')::float >= :minScore`,
        { minScore: 0.8 }
      );
    });

    it('should use default minScore of 0.7', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.getHighScoringPredictions();

      expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), {
        minScore: 0.7,
      });
    });
  });

  describe('getPredictionStats', () => {
    it('should calculate prediction statistics', async () => {
      const predictions = [
        {
          ...mockPrediction,
          prediction: { score: 0.8 },
          scope: 'product',
          modelVersion: 'v1.0',
        },
        {
          ...mockPrediction,
          id: 'p2',
          prediction: { score: 0.6 },
          scope: 'store',
          modelVersion: 'v1.0',
        },
      ] as AiPredictorStat[];

      queryBuilder.getMany!.mockResolvedValue(predictions);

      const stats = await repo.getPredictionStats({ storeId: 's1' });

      expect(stats.totalPredictions).toBe(2);
      expect(stats.averageScore).toBeCloseTo(0.7);
      expect(stats.scoreDistribution).toBeDefined();
      expect(stats.byModelVersion['v1.0']).toBe(2);
    });

    it('should handle invalid scores', async () => {
      const predictions = [
        { ...mockPrediction, prediction: { score: NaN } },
      ] as AiPredictorStat[];

      queryBuilder.getMany!.mockResolvedValue(predictions);

      const stats = await repo.getPredictionStats();

      expect(stats.averageScore).toBe(0);
    });
  });

  describe('getTrendingProducts', () => {
    it('should return trending products', async () => {
      const rawResults = [
        {
          productId: 'p1',
          predictionCount: '10',
          avgScore: '0.85',
          maxScore: '0.9',
          minScore: '0.8',
          scoreStddev: '0.05',
        },
        {
          productId: 'p2',
          predictionCount: '5',
          avgScore: '0.6',
          maxScore: '0.65',
          minScore: '0.55',
          scoreStddev: '0.15',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getTrendingProducts('s1', {
        limit: 10,
        timeframe: 'week',
        minPredictions: 2,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        productId: 'p1',
        latestScore: 0.9,
        avgScore: 0.85,
        predictionCount: 10,
        trend: 'stable',
      });
      expect(result[1].trend).toBe('down');
    });

    it('should apply timeframe filters', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTrendingProducts('s1', { timeframe: 'day' });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('compareModelVersions', () => {
    it('should compare model performance', async () => {
      const rawResults = [
        {
          modelVersion: 'v1.0',
          totalPredictions: '100',
          averageScore: '0.85',
        },
        {
          modelVersion: 'v2.0',
          totalPredictions: '50',
          averageScore: '0.9',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.compareModelVersions('s1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        modelVersion: 'v1.0',
        totalPredictions: 100,
        averageScore: 0.85,
      });
    });

    it('should handle null model versions', async () => {
      const rawResults = [
        {
          modelVersion: null,
          totalPredictions: '10',
          averageScore: '0.7',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.compareModelVersions();

      expect(result[0].modelVersion).toBe('default');
    });
  });

  describe('cleanupOldPredictions', () => {
    it('should cleanup old predictions', async () => {
      queryBuilder.execute!.mockResolvedValue({ affected: 50 });

      const result = await repo.cleanupOldPredictions(90);

      expect(result).toBe(50);
      expect(queryBuilder.delete).toHaveBeenCalled();
    });

    it('should handle no affected rows', async () => {
      queryBuilder.execute!.mockResolvedValue({ affected: 0 });

      const result = await repo.cleanupOldPredictions(30);

      expect(result).toBe(0);
    });
  });

  describe('applyQueryOptions', () => {
    it('should apply all query options', () => {
      const options = {
        modelVersion: 'v1.0',
        scoreThreshold: 0.7,
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-31'),
        limit: 10,
        offset: 5,
      };

      (repo as any).applyQueryOptions(queryBuilder, options);

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(4);
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
      expect(queryBuilder.offset).toHaveBeenCalledWith(5);
    });

    it('should skip undefined options', () => {
      (repo as any).applyQueryOptions(queryBuilder, {});

      expect(queryBuilder.limit).not.toHaveBeenCalled();
      expect(queryBuilder.offset).not.toHaveBeenCalled();
    });
  });

  describe('calculatePredictionStats', () => {
    it('should calculate comprehensive statistics', () => {
      const stats = [
        {
          ...mockPrediction,
          prediction: { score: 0.3 },
          modelVersion: 'v1',
          scope: 'product',
        },
        {
          ...mockPrediction,
          prediction: { score: 0.5 },
          modelVersion: 'v1',
          scope: 'product',
        },
        {
          ...mockPrediction,
          prediction: { score: 0.8 },
          modelVersion: 'v2',
          scope: 'store',
        },
      ] as AiPredictorStat[];

      const result = (repo as any).calculatePredictionStats(stats);

      expect(result.totalPredictions).toBe(3);
      expect(result.scoreDistribution.low).toBe(1);
      expect(result.scoreDistribution.medium).toBe(1);
      expect(result.scoreDistribution.high).toBe(1);
      expect(result.byModelVersion).toHaveProperty('v1', 2);
      expect(result.byModelVersion).toHaveProperty('v2', 1);
    });
  });
});
