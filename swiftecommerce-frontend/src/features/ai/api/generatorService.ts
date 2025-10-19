import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  GenerateCustomRequest,
  GenerateDescriptionRequest,
  GenerateIdeasRequest,
  GenerateNamesRequest,
  UsageStats,
} from '@/features/ai/types/ai-generator.types.ts';

export class AIGeneratorService extends BaseService {
  /**
   * Generate product names
   */
  async generateNames(
    storeId: string,
    data: GenerateNamesRequest
  ): Promise<string[]> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.GENERATE_NAMES, {
      storeId,
    });
    return this.client.post<string[]>(url, data);
  }

  /**
   * Generate product description
   */
  async generateDescription(
    storeId: string,
    data: GenerateDescriptionRequest
  ): Promise<string> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.GENERATE_DESCRIPTION, {
      storeId,
    });
    return this.client.post<string>(url, data);
  }

  /**
   * Generate product ideas
   */
  async generateIdeas(
    storeId: string,
    data: GenerateIdeasRequest
  ): Promise<string[]> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.GENERATE_IDEAS, {
      storeId,
    });
    return this.client.post<string[]>(url, data);
  }

  /**
   * Generate custom content
   */
  async generateCustom(
    storeId: string,
    data: GenerateCustomRequest
  ): Promise<string> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.GENERATE_CUSTOM, {
      storeId,
    });
    return this.client.post<string>(url, data);
  }

  /**
   * Get generation types
   */
  async getGenerationTypes(storeId: string): Promise<string[]> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.GET_TYPES, { storeId });
    return this.client.get<string[]>(url);
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(
    storeId: string,
    params?: { from?: string; to?: string }
  ): Promise<UsageStats> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.USAGE_STATS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<UsageStats>(urlWithParams);
  }

  /**
   * Get health status
   */
  async getHealth(storeId: string): Promise<{ status: string; model: string }> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.HEALTH, { storeId });
    return this.client.get(url);
  }
}

export const aiGeneratorService = new AIGeneratorService();
