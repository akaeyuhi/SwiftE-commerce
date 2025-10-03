import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { AiPredictorStat } from 'src/entities/ai/ai-predictor-stat.entity';
import {
  PredictionQueryOptions,
  PredictionStatsResult,
} from 'src/common/interfaces/ai/predictor.interface';

/**
 * Enhanced AiPredictorRepository with advanced query methods
 */
@Injectable()
export class AiPredictorRepository extends BaseRepository<AiPredictorStat> {
  constructor(dataSource: DataSource) {
    super(AiPredictorStat, dataSource.createEntityManager());
  }

  /**
   * Get latest predictions for a product
   */
  async getProductPredictions(
    productId: string,
    options: PredictionQueryOptions = {}
  ): Promise<AiPredictorStat[]> {
    const qb = this.createQueryBuilder('stat')
      .where('stat.productId = :productId', { productId })
      .orderBy('stat.createdAt', 'DESC');

    this.applyQueryOptions(qb, options);
    return qb.getMany();
  }

  /**
   * Get predictions for a store
   */
  async getStorePredictions(
    storeId: string,
    options: PredictionQueryOptions = {}
  ): Promise<AiPredictorStat[]> {
    const qb = this.createQueryBuilder('stat')
      .where('stat.storeId = :storeId', { storeId })
      .orderBy('stat.createdAt', 'DESC');

    this.applyQueryOptions(qb, options);
    return qb.getMany();
  }

  /**
   * Get high-scoring predictions (trending/recommended items)
   */
  async getHighScoringPredictions(
    options: PredictionQueryOptions & {
      storeId?: string;
      minScore?: number;
    } = {}
  ): Promise<AiPredictorStat[]> {
    const { minScore = 0.7, storeId, ...queryOptions } = options;

    const qb = this.createQueryBuilder('stat')
      .where(`(stat.prediction->>'score')::float >= :minScore`, { minScore })
      .orderBy(`(stat.prediction->>'score')::float`, 'DESC')
      .addOrderBy('stat.createdAt', 'DESC');

    if (storeId) {
      qb.andWhere('stat.storeId = :storeId', { storeId });
    }

    this.applyQueryOptions(qb, queryOptions);
    return qb.getMany();
  }

  /**
   * Get prediction statistics with comprehensive metrics
   */
  async getPredictionStats(
    filters: {
      storeId?: string;
      productId?: string;
      modelVersion?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<PredictionStatsResult> {
    const qb = this.createQueryBuilder('stat');

    if (filters.storeId) {
      qb.andWhere('stat.storeId = :storeId', { storeId: filters.storeId });
    }

    if (filters.productId) {
      qb.andWhere('stat.productId = :productId', {
        productId: filters.productId,
      });
    }

    if (filters.modelVersion) {
      qb.andWhere('stat.modelVersion = :modelVersion', {
        modelVersion: filters.modelVersion,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('stat.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      qb.andWhere('stat.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    // Get all stats for processing
    const stats = await qb.getMany();

    return this.calculatePredictionStats(stats);
  }

  /**
   * Get trending products based on prediction scores
   */
  async getTrendingProducts(
    storeId: string,
    options: {
      limit?: number;
      timeframe?: 'day' | 'week' | 'month';
      minPredictions?: number;
    } = {}
  ): Promise<
    Array<{
      productId: string;
      latestScore: number;
      avgScore: number;
      predictionCount: number;
      trend: 'up' | 'down' | 'stable';
    }>
  > {
    const { limit = 10, timeframe = 'week', minPredictions = 2 } = options;

    let dateFilter: Date;
    switch (timeframe) {
      case 'day':
        dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const rawResults = await this.createQueryBuilder('stat')
      .select([
        'stat.productId as productId',
        'COUNT(*) as predictionCount',
        `AVG((stat.prediction->>'score')::float) as avgScore`,
        `MAX((stat.prediction->>'score')::float) as maxScore`,
        `MIN((stat.prediction->>'score')::float) as minScore`,
        `STDDEV((stat.prediction->>'score')::float) as scoreStddev`,
      ])
      .where('stat.storeId = :storeId', { storeId })
      .andWhere('stat.productId IS NOT NULL')
      .andWhere('stat.createdAt >= :dateFilter', { dateFilter })
      .andWhere('stat.prediction IS NOT NULL')
      .groupBy('stat.productId')
      .having('COUNT(*) >= :minPredictions', { minPredictions })
      .orderBy('avgScore', 'DESC')
      .limit(limit)
      .getRawMany();

    // Calculate trends and format results
    return rawResults.map((row) => {
      const avgScore = parseFloat(row.avgScore || '0');
      const maxScore = parseFloat(row.maxScore || '0');
      const minScore = parseFloat(row.minScore || '0');
      const stddev = parseFloat(row.scoreStddev || '0');

      // Simple trend calculation based on score variance
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (stddev > 0.1) {
        trend = maxScore > minScore + 0.2 ? 'up' : 'down';
      }

      return {
        productId: row.productId,
        latestScore: maxScore,
        avgScore,
        predictionCount: parseInt(row.predictionCount),
        trend,
      };
    });
  }

  /**
   * Compare model performance
   */
  async compareModelVersions(
    storeId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<
    Array<{
      modelVersion: string;
      totalPredictions: number;
      averageScore: number;
      accuracy?: number; // if you have ground truth data
    }>
  > {
    const qb = this.createQueryBuilder('stat')
      .select([
        `COALESCE(stat.modelVersion, 'default') as modelVersion`,
        'COUNT(*) as totalPredictions',
        `AVG((stat.prediction->>'score')::float) as averageScore`,
      ])
      .groupBy(`COALESCE(stat.modelVersion, 'default')`)
      .orderBy('averageScore', 'DESC');

    if (storeId) {
      qb.andWhere('stat.storeId = :storeId', { storeId });
    }

    if (dateFrom) {
      qb.andWhere('stat.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('stat.createdAt <= :dateTo', { dateTo });
    }

    const rawResults = await qb.getRawMany();

    return rawResults.map((row) => ({
      modelVersion: row.modelVersion || 'default',
      totalPredictions: parseInt(row.totalPredictions),
      averageScore: parseFloat(row.averageScore || '0'),
    }));
  }

  /**
   * Cleanup old predictions
   */
  async cleanupOldPredictions(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Apply common query options to query builder
   */
  private applyQueryOptions(qb: any, options: PredictionQueryOptions) {
    if (options.modelVersion) {
      qb.andWhere('stat.modelVersion = :modelVersion', {
        modelVersion: options.modelVersion,
      });
    }

    if (options.scoreThreshold !== undefined) {
      qb.andWhere(`(stat.prediction->>'score')::float >= :threshold`, {
        threshold: options.scoreThreshold,
      });
    }

    if (options.dateFrom) {
      qb.andWhere('stat.createdAt >= :dateFrom', {
        dateFrom: options.dateFrom,
      });
    }

    if (options.dateTo) {
      qb.andWhere('stat.createdAt <= :dateTo', { dateTo: options.dateTo });
    }

    if (options.limit) {
      qb.limit(options.limit);
    }

    if (options.offset) {
      qb.offset(options.offset);
    }
  }

  /**
   * Calculate comprehensive prediction statistics
   */
  private calculatePredictionStats(
    stats: AiPredictorStat[]
  ): PredictionStatsResult {
    const totalPredictions = stats.length;

    // Extract scores
    const scores = stats
      .map((s) => {
        const score = s.prediction?.score;
        return typeof score === 'number' ? score : parseFloat(score || '0');
      })
      .filter((score) => !isNaN(score) && isFinite(score));

    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

    // Score distribution
    const scoreDistribution = {
      low: scores.filter((s) => s < 0.4).length,
      medium: scores.filter((s) => s >= 0.4 && s < 0.7).length,
      high: scores.filter((s) => s >= 0.7).length,
    };

    // By model version
    const byModelVersion: Record<string, number> = {};
    stats.forEach((stat) => {
      const version = stat.modelVersion || 'default';
      byModelVersion[version] = (byModelVersion[version] || 0) + 1;
    });

    // By scope
    const byScope: Record<string, number> = {};
    stats.forEach((stat) => {
      byScope[stat.scope] = (byScope[stat.scope] || 0) + 1;
    });

    // Daily breakdown
    const dailyMap = new Map<string, { count: number; totalScore: number }>();
    stats.forEach((stat) => {
      const date = stat.createdAt.toISOString().split('T')[0];
      const score = parseFloat(stat.prediction?.score || '0');

      if (!dailyMap.has(date)) {
        dailyMap.set(date, { count: 0, totalScore: 0 });
      }

      const dayData = dailyMap.get(date)!;
      dayData.count++;
      if (!isNaN(score)) {
        dayData.totalScore += score;
      }
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        avgScore: data.count > 0 ? data.totalScore / data.count : 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalPredictions,
      averageScore,
      scoreDistribution,
      byModelVersion,
      byScope,
      dailyBreakdown,
    };
  }
}
