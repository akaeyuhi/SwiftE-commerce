import { Injectable, Logger } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import { CreateAiLogDto } from './dto/create-ai-log.dto';
import { UpdateAiLogDto } from './dto/update-ai-log.dto';
import { AiLogsRepository } from 'src/modules/ai/ai-logs/ai-logs.repository';
import {
  ErrorLogsFilterOptions,
  HealthCheckReport,
  LogDailyUsageFilterOptions,
  LogFilterOptions,
  LogTopFeaturesFilterOptions,
  LogUsageStatsFilterOptions,
  RecordAiLogParams,
  UsageStats,
  UsageTrend,
} from 'src/modules/ai/ai-logs/types';

/**
 * AiLogsService with comprehensive logging capabilities
 *
 * Extends BaseService for CRUD operations and adds:
 * - Smart prompt sanitization
 * - Usage analytics and reporting
 * - Error tracking and monitoring
 * - Performance metrics
 */
@Injectable()
export class AiLogsService extends BaseService<
  AiLog,
  CreateAiLogDto,
  UpdateAiLogDto
> {
  private readonly logger = new Logger(AiLogsService.name);

  // Rate limiting for excessive logging
  private readonly logRateLimit = new Map<string, number>();
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly maxLogsPerMinute = 100;

  // Sensitive data patterns for sanitization
  private readonly sensitivePatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{3}-\d{3}-\d{4}\b/g, // Phone numbers
    /\b4[0-9]{12}(?:[0-9]{3})?\b/g, // Credit card numbers (Visa)
    /\b5[1-5][0-9]{14}\b/g, // Credit card numbers (MasterCard)
    /https?:\/\/[^\s]+/g, // URLs
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, // Bearer tokens
    /api[_-]?key['":\s]*[A-Za-z0-9\-._~+/]+=*/gi, // API keys
  ];

  constructor(private readonly logRepo: AiLogsRepository) {
    super(logRepo);
  }

  /**
   * Enhanced record method with rate limiting and sanitization
   */
  async record(params: RecordAiLogParams): Promise<AiLog> {
    try {
      // Rate limiting check
      if (
        !this.checkRateLimit(params.userId || params.storeId || 'anonymous')
      ) {
        this.logger.warn(
          `Rate limit exceeded for AI logging: ${params.feature}`
        );
        throw new Error('Rate limit exceeded for AI logging');
      }

      // Sanitize sensitive data
      const sanitizedParams = this.sanitizeLogData(params);

      // Prepare payload
      const payload: any = {
        feature: sanitizedParams.feature,
        details: this.prepareDetails(sanitizedParams),
      };

      if (sanitizedParams.userId) {
        payload.userId = sanitizedParams.userId;
      }

      if (sanitizedParams.storeId) {
        payload.storeId = sanitizedParams.storeId;
      }

      const saved = await this.logRepo.createEntity(payload);

      this.logger.debug(
        `AiLog recorded: feature=${sanitizedParams.feature} user=${sanitizedParams.userId ?? 'n/a'} store=${sanitizedParams.storeId ?? 'n/a'}`
      );

      return saved;
    } catch (error) {
      this.logger.error(`Failed to record AI log: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Bulk record multiple logs (for batch operations)
   */
  async recordBatch(logs: RecordAiLogParams[]): Promise<AiLog[]> {
    const results: AiLog[] = [];

    // Process in smaller batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);

      const batchPromises = batch.map(async (logParams) => {
        try {
          return await this.record(logParams);
        } catch (error) {
          this.logger.error(`Failed to record log in batch: ${error.message}`);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });
    }

    this.logger.debug(
      `Batch recorded ${results.length}/${logs.length} AI logs`
    );
    return results;
  }

  /**
   * Enhanced query with comprehensive filtering
   */
  async findByFilter(filters: LogFilterOptions = {}): Promise<AiLog[]> {
    return this.logRepo.findByFilter(filters);
  }

  /**
   * Get comprehensive usage statistics
   */
  async getUsageStats(
    filters: LogUsageStatsFilterOptions = {}
  ): Promise<UsageStats> {
    return this.logRepo.getUsageStats(filters);
  }

  /**
   * Get top features by usage
   */
  async getTopFeatures(
    limit: number = 10,
    filters: LogTopFeaturesFilterOptions = {}
  ) {
    return this.logRepo.getTopFeatures(limit, filters);
  }

  /**
   * Get daily usage metrics
   */
  async getDailyUsage(
    days: number = 30,
    filters: LogDailyUsageFilterOptions = {}
  ) {
    return this.logRepo.getDailyUsage(days, filters);
  }

  /**
   * Get error logs for debugging
   */
  async getErrorLogs(
    limit: number = 100,
    filters: ErrorLogsFilterOptions = {}
  ) {
    return this.logRepo.getErrorLogs(limit, filters);
  }

  /**
   * Get usage trends and insights
   */
  async getUsageTrends(
    days: number = 30,
    filters: {
      storeId?: string;
      userId?: string;
    } = {}
  ): Promise<UsageTrend> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const midDate = new Date(
      endDate.getTime() - (days / 2) * 24 * 60 * 60 * 1000
    );

    // Get usage for first and second half of the period
    const firstHalf = await this.getUsageStats({
      ...filters,
      dateFrom: startDate,
      dateTo: midDate,
    });

    const secondHalf = await this.getUsageStats({
      ...filters,
      dateFrom: midDate,
      dateTo: endDate,
    });

    const changePercentage =
      firstHalf.totalLogs > 0
        ? ((secondHalf.totalLogs - firstHalf.totalLogs) / firstHalf.totalLogs) *
          100
        : 0;

    const trend =
      changePercentage > 10 ? 'up' : changePercentage < -10 ? 'down' : 'stable';

    const insights = this.generateInsights(firstHalf, secondHalf);
    const recommendations = this.generateRecommendations(
      firstHalf,
      secondHalf,
      trend
    );

    return {
      trend,
      changePercentage,
      insights,
      recommendations,
    };
  }

  /**
   * Cleanup old logs with configurable retention
   */
  async cleanup(
    retentionDays: number = 30,
    dryRun: boolean = false
  ): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    try {
      if (dryRun) {
        // Count how many would be deleted
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const count = await this.logRepo
          .createQueryBuilder('l')
          .where('l.createdAt < :cutoffDate', { cutoffDate })
          .getCount();

        return { deletedCount: count, errors: [] };
      }

      const deletedCount = await this.logRepo.cleanupOldLogs(retentionDays);

      this.logger.log(
        `Cleaned up ${deletedCount} old AI logs older than ${retentionDays} days`
      );

      return { deletedCount, errors: [] };
    } catch (error) {
      this.logger.error(`Failed to cleanup AI logs: ${error.message}`, error);
      return { deletedCount: 0, errors: [error.message] };
    }
  }

  /**
   * Health check for logging service
   */
  async healthCheck(): Promise<HealthCheckReport> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentLogs = await this.findByFilter({
        dateFrom: oneDayAgo,
        limit: 1000,
      });

      const errorLogs = await this.getErrorLogs(100, {
        dateFrom: oneDayAgo,
      });

      const errorRate =
        recentLogs.length > 0
          ? (errorLogs.length / recentLogs.length) * 100
          : 0;

      const averageLogSize =
        recentLogs.length > 0
          ? recentLogs.reduce(
              (sum, log) =>
                sum + (log.details ? JSON.stringify(log.details).length : 0),
              0
            ) / recentLogs.length
          : 0;

      return {
        healthy: true,
        metrics: {
          recentLogsCount: recentLogs.length,
          errorRate,
          averageLogSize,
        },
      };
    } catch (error) {
      this.logger.error('AI Logs health check failed:', error);
      return {
        healthy: false,
        metrics: {
          recentLogsCount: 0,
          errorRate: 100,
          averageLogSize: 0,
        },
      };
    }
  }
  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / this.rateLimitWindow)}`;

    const currentCount = this.logRateLimit.get(key) || 0;

    if (currentCount >= this.maxLogsPerMinute) {
      return false;
    }

    this.logRateLimit.set(key, currentCount + 1);

    // Cleanup old entries
    if (this.logRateLimit.size > 1000) {
      this.cleanupRateLimit();
    }

    return true;
  }

  private cleanupRateLimit(): void {
    const now = Date.now();
    const cutoff = now - this.rateLimitWindow * 2;

    for (const [key] of Array.from(this.logRateLimit.entries())) {
      const keyTime = parseInt(key.split(':')[1]) * this.rateLimitWindow;
      if (keyTime < cutoff) {
        this.logRateLimit.delete(key);
      }
    }
  }

  private sanitizeLogData(params: RecordAiLogParams): RecordAiLogParams {
    const sanitized = { ...params };

    // Sanitize prompt
    if (sanitized.prompt) {
      sanitized.prompt = this.sanitizeText(sanitized.prompt);
    }

    // Sanitize details
    if (sanitized.details) {
      sanitized.details = this.sanitizeObject(sanitized.details);
    }

    return sanitized;
  }

  private sanitizeText(text: string): string {
    let sanitized = text;

    this.sensitivePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Truncate if too long
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 997) + '...';
    }

    return sanitized;
  }

  private sanitizeObject(obj: any): any {
    // Handle primitives
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      sanitized[key] = this.sanitizeObject(value); // Recursive call handles all types now
    }

    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'authorization',
      'credential',
      'private',
      'confidential',
      'ssn',
      'social',
    ];

    return sensitiveKeys.some((sensitiveKey) =>
      key.toLowerCase().includes(sensitiveKey)
    );
  }

  private prepareDetails(params: RecordAiLogParams): Record<string, any> {
    const details: Record<string, any> = { ...(params.details || {}) };

    // Add prompt if provided
    if (params.prompt) {
      details.prompt = params.prompt;
    }

    // Add timestamp
    details.recordedAt = new Date().toISOString();

    // Add service metadata
    details.serviceVersion = process.env.npm_package_version || '1.0.0';

    return details;
  }

  private generateInsights(
    firstHalf: UsageStats,
    secondHalf: UsageStats
  ): string[] {
    const insights: string[] = [];

    // Compare total usage
    const usageChange = secondHalf.totalLogs - firstHalf.totalLogs;
    if (Math.abs(usageChange) > 10) {
      insights.push(
        `AI usage ${usageChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(usageChange)} requests`
      );
    }

    // Compare top features
    const firstTopFeature = firstHalf.topFeatures[0];
    const secondTopFeature = secondHalf.topFeatures[0];

    if (
      firstTopFeature &&
      secondTopFeature &&
      firstTopFeature.feature !== secondTopFeature.feature
    ) {
      insights.push(
        `Most popular feature changed from "${firstTopFeature.feature}" to "${secondTopFeature.feature}"`
      );
    }

    // Check for new features
    const firstFeatures = new Set(firstHalf.topFeatures.map((f) => f.feature));
    const newFeatures = secondHalf.topFeatures
      .filter((f) => !firstFeatures.has(f.feature))
      .slice(0, 3);

    if (newFeatures.length > 0) {
      insights.push(
        `New popular features: ${newFeatures.map((f) => f.feature).join(', ')}`
      );
    }

    return insights;
  }

  private generateRecommendations(
    firstHalf: UsageStats,
    secondHalf: UsageStats,
    trend: 'up' | 'down' | 'stable'
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'up') {
      recommendations.push(
        'Consider scaling AI infrastructure to handle increased demand'
      );
      recommendations.push('Monitor cost implications of increased usage');
    } else if (trend === 'down') {
      recommendations.push(
        'Investigate potential issues causing decreased usage'
      );
      recommendations.push('Consider user engagement strategies');
    }

    // High error rate recommendation
    const totalErrors = Object.values(secondHalf.byFeature).reduce(
      (sum, count) => sum + count,
      0
    );
    if (totalErrors > secondHalf.totalLogs * 0.1) {
      recommendations.push(
        'High error rate detected - review error logs and implement fixes'
      );
    }

    // Data retention recommendation
    if (secondHalf.averageDetailsSize > 5000) {
      recommendations.push(
        'Consider reducing log detail verbosity to optimize storage'
      );
    }

    return recommendations;
  }
}
