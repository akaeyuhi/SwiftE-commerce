import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  GenerateCustomRequest,
  GenerateDescriptionRequest,
  GenerateIdeasRequest,
  GenerateImageRequest,
  GenerateNamesRequest,
  GeneratePostRequest,
  GenerateResponse,
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
    const response = await this.client.post<{ data: { names: string[] } }>(
      url,
      data
    );
    return response.data.names;
  }

  /**
   * Generate product description
   */
  async generateDescription(
    storeId: string,
    data: GenerateDescriptionRequest
  ): Promise<{ title: string; description: string }> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.GENERATE_DESCRIPTION, {
      storeId,
    });
    const response = await this.client.post<{
      data: { result: { title: string; description: string } };
    }>(url, data);
    return response.data.result;
  }

  /**
   * Generate product ideas
   */
  async generateIdeas(
    storeId: string,
    data: GenerateIdeasRequest
  ): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.GENERATE_IDEAS, {
      storeId,
    });
    const response = await this.client.post<{ data: any }>(url, data);
    return response.data;
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
    const response = await this.client.post<{ data: { result: string } }>(
      url,
      data
    );
    return response.data.result;
  }

  async generateImage(
    storeId: string,
    data: GenerateImageRequest
  ): Promise<string> {
    const url = this.buildUrl(API_ENDPOINTS.AI_GENERATOR.GENERATE_IMAGE, {
      storeId,
    });
    const response = await this.client.post<GenerateResponse<string>>(
      url,
      data
    );
    return response.data.result;
  }

  /**
   * Generate a news post
   */
  async generatePost(
    storeId: string,
    data: GeneratePostRequest
  ): Promise<{ title: string; content: string }> {
    const url = buildUrl(API_ENDPOINTS.AI_GENERATOR.GENERATE_POST, {
      storeId,
    });
    const response = await this.client.post<
      GenerateResponse<{ title: string; content: string }>
    >(url, data);
    return response.data.result;
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
