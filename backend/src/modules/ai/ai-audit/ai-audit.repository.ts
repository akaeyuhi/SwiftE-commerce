import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { AiAudit } from 'src/entities/ai/ai-audit.entity';
import {
  AuditQueryOptions,
  AuditStats,
} from 'src/common/interfaces/ai/audit.interface';

/**
 * AiAuditRepository with advanced querying and security features
 */
@Injectable()
export class AiAuditRepository extends BaseRepository<AiAudit> {
  constructor(dataSource: DataSource) {
    super(AiAudit, dataSource.createEntityManager());
  }

  /**
   * Find audits with comprehensive filtering
   */
  async findByFilter(
    filter: {
      storeId?: string;
      userId?: string;
      feature?: string;
      provider?: string;
      model?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    options: AuditQueryOptions = {}
  ): Promise<AiAudit[]> {
    const qb = this.createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .leftJoinAndSelect('a.store', 's')
      .orderBy('a.createdAt', 'DESC');

    if (filter.storeId) {
      qb.andWhere('s.id = :storeId', { storeId: filter.storeId });
    }

    if (filter.userId) {
      qb.andWhere('u.id = :userId', { userId: filter.userId });
    }

    if (filter.feature) {
      qb.andWhere('a.feature = :feature', { feature: filter.feature });
    }

    if (filter.provider) {
      qb.andWhere('a.provider = :provider', { provider: filter.provider });
    }

    if (filter.model) {
      qb.andWhere('a.model = :model', { model: filter.model });
    }

    if (filter.dateFrom) {
      qb.andWhere('a.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }

    if (filter.dateTo) {
      qb.andWhere('a.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    // Fix: Check for undefined instead of falsy value
    if (options.limit !== undefined) {
      qb.limit(options.limit);
    }

    if (options.offset !== undefined) {
      qb.offset(options.offset);
    }

    return qb.getMany();
  }

  /**
   * Get comprehensive audit statistics
   */
  async getAuditStats(
    filters: {
      storeId?: string;
      userId?: string;
      feature?: string;
      provider?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<AuditStats> {
    const qb = this.createQueryBuilder('a')
      .leftJoin('a.user', 'u')
      .leftJoin('a.store', 's');

    if (filters.storeId) {
      qb.andWhere('s.id = :storeId', { storeId: filters.storeId });
    }

    if (filters.userId) {
      qb.andWhere('u.id = :userId', { userId: filters.userId });
    }

    if (filters.feature) {
      qb.andWhere('a.feature = :feature', { feature: filters.feature });
    }

    if (filters.provider) {
      qb.andWhere('a.provider = :provider', { provider: filters.provider });
    }

    if (filters.dateFrom) {
      qb.andWhere('a.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('a.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    const audits = await qb.getMany();
    return this.calculateAuditStats(audits);
  }

  /**
   * Get audit entries by provider for analysis
   */
  async getByProvider(
    provider: string,
    options: AuditQueryOptions & {
      storeId?: string;
      userId?: string;
      feature?: string;
    } = {}
  ): Promise<AiAudit[]> {
    const qb = this.createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .leftJoinAndSelect('a.store', 's')
      .where('a.provider = :provider', { provider })
      .orderBy('a.createdAt', 'DESC');

    if (options.storeId) {
      qb.andWhere('s.id = :storeId', { storeId: options.storeId });
    }

    if (options.userId) {
      qb.andWhere('u.id = :userId', { userId: options.userId });
    }

    if (options.feature) {
      qb.andWhere('a.feature = :feature', { feature: options.feature });
    }

    if (options.dateFrom) {
      qb.andWhere('a.createdAt >= :dateFrom', { dateFrom: options.dateFrom });
    }

    if (options.dateTo) {
      qb.andWhere('a.createdAt <= :dateTo', { dateTo: options.dateTo });
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
   * Get recent audit entries for monitoring
   */
  async getRecentAudits(
    minutes: number = 60,
    limit: number = 100
  ): Promise<AiAudit[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    return this.createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .leftJoinAndSelect('a.store', 's')
      .where('a.createdAt >= :cutoffTime', { cutoffTime })
      .orderBy('a.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Get audit entries with suspicious patterns (for security monitoring)
   */
  async getSuspiciousAudits(
    options: {
      unusualVolume?: boolean;
      failedDecryption?: boolean;
      unusualProviders?: boolean;
      limit?: number;
    } = {}
  ): Promise<AiAudit[]> {
    const qb = this.createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .leftJoinAndSelect('a.store', 's')
      .orderBy('a.createdAt', 'DESC');

    // This is a simplified example - in practice, you'd implement more sophisticated detection
    if (options.unusualVolume) {
      // Find users/stores with unusually high audit volume in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      qb.andWhere('a.createdAt >= :oneHourAgo', { oneHourAgo });
    }

    if (options.unusualProviders) {
      // Look for rarely used providers (this would need more sophisticated logic)
      qb.andWhere('a.provider NOT IN (:...commonProviders)', {
        commonProviders: ['openai', 'anthropic', 'predictor'],
      });
    }

    if (options.limit) {
      qb.limit(options.limit);
    }

    return qb.getMany();
  }

  /**
   * Validate encryption integrity
   */
  async validateEncryptionIntegrity(sampleSize: number = 100): Promise<{
    totalChecked: number;
    validEntries: number;
    corruptedEntries: number;
    healthPercentage: number;
  }> {
    const recentAudits = await this.createQueryBuilder('a')
      .orderBy('RANDOM()')
      .limit(sampleSize)
      .getMany();

    let validEntries = 0;
    let corruptedEntries = 0;

    for (const audit of recentAudits) {
      try {
        // Check if encrypted response has required fields
        const encryptedResponse = audit.encryptedResponse;
        if (
          encryptedResponse &&
          encryptedResponse.ciphertext &&
          encryptedResponse.iv &&
          encryptedResponse.tag
        ) {
          validEntries++;
        } else {
          corruptedEntries++;
        }
      } catch (err) {
        console.error(err.message);
        corruptedEntries++;
      }
    }

    const totalChecked = recentAudits.length;
    const healthPercentage =
      totalChecked > 0 ? (validEntries / totalChecked) * 100 : 0;

    return {
      totalChecked,
      validEntries,
      corruptedEntries,
      healthPercentage,
    };
  }

  /**
   * Cleanup old audit entries with configurable retention
   */
  async cleanupOldAudits(
    olderThanDays: number = 90,
    preserveCount: number = 1000
  ): Promise<{
    deletedCount: number;
    preservedCount: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // First, get IDs of entries to preserve (most recent ones)
    const preserveIds = await this.createQueryBuilder('a')
      .select('a.id')
      .where('a.createdAt < :cutoffDate', { cutoffDate })
      .orderBy('a.createdAt', 'DESC')
      .limit(preserveCount)
      .getRawMany();

    const preserveIdList = preserveIds.map((row) => row.a_id);

    // Delete old entries except preserved ones
    const deleteQb = this.createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate });

    if (preserveIdList.length > 0) {
      deleteQb.andWhere('id NOT IN (:...preserveIds)', {
        preserveIds: preserveIdList,
      });
    }

    const deleteResult = await deleteQb.execute();

    return {
      deletedCount: deleteResult.affected || 0,
      preservedCount: preserveIds.length,
    };
  }

  private calculateAuditStats(audits: AiAudit[]): AuditStats {
    const totalAudits = audits.length;

    // By feature
    const byFeature: Record<string, number> = {};
    audits.forEach((audit) => {
      byFeature[audit.feature] = (byFeature[audit.feature] || 0) + 1;
    });

    // By provider
    const byProvider: Record<string, number> = {};
    audits.forEach((audit) => {
      const provider = audit.provider || 'unknown';
      byProvider[provider] = (byProvider[provider] || 0) + 1;
    });

    // By user
    const byUser: Record<string, number> = {};
    audits.forEach((audit) => {
      if (audit.user?.id) {
        byUser[audit.user.id] = (byUser[audit.user.id] || 0) + 1;
      }
    });

    // By store
    const byStore: Record<string, number> = {};
    audits.forEach((audit) => {
      if (audit.store?.id) {
        byStore[audit.store.id] = (byStore[audit.store.id] || 0) + 1;
      }
    });

    // Daily breakdown
    const dailyMap = new Map<string, number>();
    audits.forEach((audit) => {
      const date = audit.createdAt.toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Average response size
    const responseSizes = audits
      .map((audit) => JSON.stringify(audit.encryptedResponse).length)
      .filter((size) => size > 0);

    const averageResponseSize =
      responseSizes.length > 0
        ? responseSizes.reduce((sum, size) => sum + size, 0) /
          responseSizes.length
        : 0;

    // Encryption health
    let validEncryption = 0;
    let corruptedEncryption = 0;

    audits.forEach((audit) => {
      try {
        const encrypted = audit.encryptedResponse;
        if (encrypted?.ciphertext && encrypted?.iv && encrypted?.tag) {
          validEncryption++;
        } else {
          corruptedEncryption++;
        }
      } catch {
        corruptedEncryption++;
      }
    });

    const healthPercentage =
      totalAudits > 0 ? (validEncryption / totalAudits) * 100 : 100;

    return {
      totalAudits,
      byFeature,
      byProvider,
      byUser,
      byStore,
      dailyBreakdown,
      averageResponseSize,
      encryptionHealth: {
        totalEncrypted: validEncryption,
        corruptedEntries: corruptedEncryption,
        healthPercentage,
      },
    };
  }
}
