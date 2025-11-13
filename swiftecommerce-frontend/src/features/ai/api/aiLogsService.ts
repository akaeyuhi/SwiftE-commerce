import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  AILogEntry,
  DailyUsage,
  ErrorLog,
  UsageStats,
} from '@/features/ai/types/ai-logs.types.ts';

export class AILogsService extends BaseService {
  /**
   * Create AI log entry
   */
  async createLog(
    storeId: string,
    data: Partial<AILogEntry>
  ): Promise<AILogEntry> {
    const url = buildUrl(API_ENDPOINTS.AI_LOGS.CREATE, { storeId });
    return this.client.post<AILogEntry>(url, data);
  }

  /**
   * Get AI logs
   */
  async getLogs(
    storeId: string,
    params?: {
      featureType?: 'generator' | 'predictor';
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<AILogEntry[]> {
    const url = buildUrl(API_ENDPOINTS.AI_LOGS.LIST, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<AILogEntry[]>(urlWithParams);
  }

  /**
   * Get usage stats
   */
  async getUsageStats(
    storeId: string,
    params?: { from?: string; to?: string }
  ): Promise<UsageStats> {
    const url = buildUrl(API_ENDPOINTS.AI_LOGS.USAGE_STATS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<UsageStats>(urlWithParams);
  }

  /**
   * Get top features
   */
  async getTopFeatures(
    storeId: string,
    params?: { limit?: number }
  ): Promise<Array<{ feature: string; count: number }>> {
    const url = buildUrl(API_ENDPOINTS.AI_LOGS.TOP_FEATURES, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Get daily usage
   */
  async getDailyUsage(
    storeId: string,
    params?: { from?: string; to?: string }
  ): Promise<DailyUsage[]> {
    const url = buildUrl(API_ENDPOINTS.AI_LOGS.DAILY_USAGE, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<DailyUsage[]>(urlWithParams);
  }

  /**
   * Get error logs
   */
  async getErrors(
    storeId: string,
    params?: { limit?: number }
  ): Promise<ErrorLog[]> {
    const url = buildUrl(API_ENDPOINTS.AI_LOGS.ERRORS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ErrorLog[]>(urlWithParams);
  }

  /**
   * Get trends
   */
  async getTrends(
    storeId: string,
    params?: { period?: 'day' | 'week' | 'month' }
  ): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.AI_LOGS.TRENDS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Get health status
   */
  async getHealth(storeId: string): Promise<{ status: string }> {
    const url = buildUrl(API_ENDPOINTS.AI_LOGS.HEALTH, { storeId });
    return this.client.get(url);
  }

  /**
   * Cleanup old logs
   */
  async cleanup(
    storeId: string,
    params?: { olderThan?: string }
  ): Promise<{ deleted: number }> {
    const url = buildUrl(API_ENDPOINTS.AI_LOGS.CLEANUP, { storeId });
    return this.client.delete(url, { params });
  }
}

export const aiLogsService = new AILogsService();
