import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import {
  LogQueryOptions,
  UsageStats,
} from 'src/common/interfaces/ai/ai-log.interface';

/**
 * AiLogsRepository with advanced querying and statistics
 */
@Injectable()
export class AiLogsRepository extends BaseRepository<AiLog> {
  constructor(dataSource: DataSource) {
    super(AiLog, dataSource.createEntityManager());
  }

  /**
   * Find logs with comprehensive filtering options
   */
  async findByFilter(
    filter: {
      storeId?: string;
      userId?: string;
      feature?: string;
      dateFrom?: Date;
      dateTo?: Date;
      hasDetails?: boolean;
    },
    options: LogQueryOptions = {}
  ): Promise<AiLog[]> {
    const qb = this.createQueryBuilder('l')
      .leftJoinAndSelect('l.user', 'u')
      .leftJoinAndSelect('l.store', 's')
      .orderBy('l.createdAt', 'DESC');

    if (filter.storeId) {
      qb.andWhere('s.id = :storeId', { storeId: filter.storeId });
    }

    if (filter.userId) {
      qb.andWhere('u.id = :userId', { userId: filter.userId });
    }

    if (filter.feature) {
      qb.andWhere('l.feature = :feature', { feature: filter.feature });
    }

    if (filter.dateFrom) {
      qb.andWhere('l.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }

    if (filter.dateTo) {
      qb.andWhere('l.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    if (filter.hasDetails !== undefined) {
      if (filter.hasDetails) {
        qb.andWhere('l.details IS NOT NULL');
      } else {
        qb.andWhere('l.details IS NULL');
      }
    }

    if (options.limit) {
      qb.limit(options.limit);
    }

    if (options.offset) {
      qb.offset(options.offset);
    }

    return qb.getMany();
  }

  /**
   * Get comprehensive usage statistics
   */
  async getUsageStats(
    filters: {
      storeId?: string;
      userId?: string;
      feature?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<UsageStats> {
    const qb = this.createQueryBuilder('l')
      .leftJoin('l.user', 'u')
      .leftJoin('l.store', 's');

    if (filters.storeId) {
      qb.andWhere('s.id = :storeId', { storeId: filters.storeId });
    }

    if (filters.userId) {
      qb.andWhere('u.id = :userId', { userId: filters.userId });
    }

    if (filters.feature) {
      qb.andWhere('l.feature = :feature', { feature: filters.feature });
    }

    if (filters.dateFrom) {
      qb.andWhere('l.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('l.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    const logs = await qb.getMany();
    return this.calculateUsageStats(logs);
  }

  /**
   * Get top features by usage count
   */
  async getTopFeatures(
    limit: number = 10,
    filters: {
      storeId?: string;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<Array<{ feature: string; count: number; percentage: number }>> {
    const qb = this.createQueryBuilder('l')
      .select(['l.feature', 'COUNT(*) as count'])
      .leftJoin('l.user', 'u')
      .leftJoin('l.store', 's')
      .groupBy('l.feature')
      .orderBy('count', 'DESC')
      .limit(limit);

    if (filters.storeId) {
      qb.andWhere('s.id = :storeId', { storeId: filters.storeId });
    }

    if (filters.userId) {
      qb.andWhere('u.id = :userId', { userId: filters.userId });
    }

    if (filters.dateFrom) {
      qb.andWhere('l.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('l.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    const results = await qb.getRawMany();
    const totalCount = results.reduce((sum, r) => sum + parseInt(r.count), 0);

    return results.map((r) => ({
      feature: r.l_feature,
      count: parseInt(r.count),
      percentage: totalCount > 0 ? (parseInt(r.count) / totalCount) * 100 : 0,
    }));
  }

  /**
   * Get daily usage metrics
   */
  async getDailyUsage(
    days: number = 30,
    filters: {
      storeId?: string;
      userId?: string;
      feature?: string;
    } = {}
  ): Promise<
    Array<{
      date: string;
      count: number;
      uniqueUsers: number;
      uniqueStores: number;
      topFeatures: string[];
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const qb = this.createQueryBuilder('l')
      .select([
        'DATE(l.createdAt) as date',
        'COUNT(*) as count',
        'COUNT(DISTINCT l.user) as uniqueUsers',
        'COUNT(DISTINCT l.store) as uniqueStores',
      ])
      .leftJoin('l.user', 'u')
      .leftJoin('l.store', 's')
      .where('l.createdAt >= :startDate', { startDate })
      .groupBy('DATE(l.createdAt)')
      .orderBy('date', 'DESC');

    if (filters.storeId) {
      qb.andWhere('s.id = :storeId', { storeId: filters.storeId });
    }

    if (filters.userId) {
      qb.andWhere('u.id = :userId', { userId: filters.userId });
    }

    if (filters.feature) {
      qb.andWhere('l.feature = :feature', { feature: filters.feature });
    }

    const dailyData = await qb.getRawMany();

    // For each day, get top features
    return await Promise.all(
      dailyData.map(async (day) => {
        const topFeatures = await this.getTopFeaturesByDate(day.date, filters);

        return {
          date: day.date,
          count: parseInt(day.count),
          uniqueUsers: parseInt(day.uniqueUsers),
          uniqueStores: parseInt(day.uniqueStores),
          topFeatures: topFeatures.slice(0, 3), // Top 3 features per day
        };
      })
    );
  }

  /**
   * Get logs with error details (for debugging)
   */
  async getErrorLogs(
    limit: number = 100,
    filters: {
      storeId?: string;
      userId?: string;
      feature?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<AiLog[]> {
    const qb = this.createQueryBuilder('l')
      .leftJoinAndSelect('l.user', 'u')
      .leftJoinAndSelect('l.store', 's')
      .where(`l.details->>'error' IS NOT NULL`)
      .orWhere(`l.details->>'success' = 'false'`)
      .orderBy('l.createdAt', 'DESC')
      .limit(limit);

    if (filters.storeId) {
      qb.andWhere('s.id = :storeId', { storeId: filters.storeId });
    }

    if (filters.userId) {
      qb.andWhere('u.id = :userId', { userId: filters.userId });
    }

    if (filters.feature) {
      qb.andWhere('l.feature = :feature', { feature: filters.feature });
    }

    if (filters.dateFrom) {
      qb.andWhere('l.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('l.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    return qb.getMany();
  }

  /**
   * Cleanup old logs
   */
  async cleanupOldLogs(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  private async getTopFeaturesByDate(
    date: string,
    filters: {
      storeId?: string;
      userId?: string;
      feature?: string;
    }
  ): Promise<string[]> {
    const qb = this.createQueryBuilder('l')
      .select(['l.feature', 'COUNT(*) as count'])
      .leftJoin('l.user', 'u')
      .leftJoin('l.store', 's')
      .where('DATE(l.createdAt) = :date', { date })
      .groupBy('l.feature')
      .orderBy('count', 'DESC')
      .limit(5);

    if (filters.storeId) {
      qb.andWhere('s.id = :storeId', { storeId: filters.storeId });
    }

    if (filters.userId) {
      qb.andWhere('u.id = :userId', { userId: filters.userId });
    }

    if (filters.feature) {
      qb.andWhere('l.feature = :feature', { feature: filters.feature });
    }

    const results = await qb.getRawMany();
    return results.map((r) => r.l_feature);
  }

  private calculateUsageStats(logs: AiLog[]): UsageStats {
    const totalLogs = logs.length;

    // By feature
    const byFeature: Record<string, number> = {};
    logs.forEach((log) => {
      byFeature[log.feature] = (byFeature[log.feature] || 0) + 1;
    });

    // By user
    const byUser: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.user?.id) {
        byUser[log.user.id] = (byUser[log.user.id] || 0) + 1;
      }
    });

    // By store
    const byStore: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.store?.id) {
        byStore[log.store.id] = (byStore[log.store.id] || 0) + 1;
      }
    });

    // Daily usage
    const dailyMap = new Map<string, number>();
    logs.forEach((log) => {
      const date = log.createdAt.toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });

    const dailyUsage = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Top features with percentages
    const topFeatures = Object.entries(byFeature)
      .map(([feature, count]) => ({
        feature,
        count,
        percentage: totalLogs > 0 ? (count / totalLogs) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average details size
    const detailsSizes = logs
      .filter((log) => log.details)
      .map((log) => JSON.stringify(log.details).length);

    const averageDetailsSize =
      detailsSizes.length > 0
        ? detailsSizes.reduce((sum, size) => sum + size, 0) /
          detailsSizes.length
        : 0;

    return {
      totalLogs,
      byFeature,
      byUser,
      byStore,
      dailyUsage,
      topFeatures,
      averageDetailsSize,
    };
  }
}
