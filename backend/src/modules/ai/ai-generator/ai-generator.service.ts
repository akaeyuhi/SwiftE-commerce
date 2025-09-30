import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { BaseAiService } from 'src/common/abstracts/ai/base.ai.service';
import { MultiTenantRateLimiter, RateLimitConfig } from './utils/rate-limiter';
import { AiLogsService } from '../ai-logs/ai-logs.service';
import { AiAuditService } from '../ai-audit/ai-audit.service';
import {
  AiGenerateOptions,
  AiGenerateResult,
  AiProvider,
} from 'src/common/interfaces/ai/generator.interface';
import {
  AiServiceRequest,
  AiServiceResponse,
} from 'src/common/interfaces/ai/ai.interface';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface GenerationRequest {
  type: 'name' | 'description' | 'ideas' | 'custom';
  prompt: string;
  options: AiGenerateOptions;
  context?: {
    storeStyle?: string;
    productSpec?: string;
    tone?: string;
    seed?: string;
    count?: number;
  };
}

export interface GenerationResponse {
  type: string;
  result: any;
  raw: string;
  metadata: {
    processingTime: number;
    tokensUsed: number;
    cost?: number;
  };
}

/**
 * Enhanced AI Generator Service
 *
 * Extends BaseAiService to provide business-level AI generation methods.
 * Features:
 * - Multi-tenant rate limiting
 * - Template-based prompt generation
 * - Response parsing and validation
 * - Cost tracking and optimization
 * - Comprehensive monitoring
 */
@Injectable()
export class AiGeneratorService extends BaseAiService<
  GenerationRequest,
  GenerationResponse
> {
  private readonly rateLimiter: MultiTenantRateLimiter;

  // Template configurations
  private readonly promptTemplates = new Map([
    [
      'productName',
      {
        template: `You are a creative product naming expert.
Context: {{storeStyle}}
Seed words: {{seed}}
Generate {{count}} short, catchy product names (2-4 words each).
Return only a JSON array of strings.`,
        defaultOptions: { maxTokens: 200, temperature: 0.8 },
      },
    ],
    [
      'productDescription',
      {
        template: `Write a compelling product description for "{{productName}}".
{{productSpec}}
Tone: {{tone}}
Length: 40-100 words.
Return JSON: {"title": "<short title>", "description": "<description>"}`,
        defaultOptions: { maxTokens: 300, temperature: 0.7 },
      },
    ],
    [
      'productIdeas',
      {
        template: `You are a product ideation assistant.
Store style: {{storeStyle}}
Seed concepts: {{seed}}
Generate {{count}} innovative product ideas.
For each idea provide: {"name": "...", "concept": "...", "rationale": "..."}
Return as JSON array.`,
        defaultOptions: { maxTokens: 500, temperature: 0.9 },
      },
    ],
    [
      'custom',
      {
        template: '{{prompt}}',
        defaultOptions: { maxTokens: 256, temperature: 0.7 },
      },
    ],
  ]);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly aiLogsService: AiLogsService,
    private readonly aiAuditService: AiAuditService
  ) {
    super();

    // Initialize rate limiter with configuration from environment
    const rateLimitConfig: RateLimitConfig = {
      capacity: parseInt(process.env.AI_RATE_CAPACITY || '30'),
      refillRate: parseFloat(process.env.AI_RATE_REFILL_PER_SEC || '0.5'),
      burstSize: parseInt(process.env.AI_RATE_BURST_SIZE || '10'),
    };

    this.rateLimiter = new MultiTenantRateLimiter(rateLimitConfig);
  }

  protected validateRequest(
    request: AiServiceRequest<GenerationRequest>
  ): void {
    const { type, prompt, options } = request.data;

    // Validate generation type
    if (!['name', 'description', 'ideas', 'custom'].includes(type)) {
      throw new Error(`Invalid generation type: ${type}`);
    }

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Prompt is required and cannot be empty');
    }

    if (prompt.length > 5000) {
      throw new Error('Prompt exceeds maximum length of 5000 characters');
    }

    // Validate options
    if (
      options.maxTokens &&
      (options.maxTokens < 1 || options.maxTokens > 2000)
    ) {
      throw new Error('maxTokens must be between 1 and 2000');
    }

    if (
      options.temperature !== undefined &&
      (options.temperature < 0 || options.temperature > 2)
    ) {
      throw new Error('temperature must be between 0 and 2');
    }

    // Check rate limit
    const tenantId = request.storeId || request.userId || 'anonymous';
    const rateLimitResult = this.rateLimiter.tryConsume(tenantId, 1);

    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        `Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.retryAfter || 0) / 1000)} seconds`
      );
    }
  }

  protected async processRequest(
    request: AiServiceRequest<GenerationRequest>
  ): Promise<AiServiceResponse<GenerationResponse>> {
    const startTime = Date.now();
    const { type, prompt, options, context } = request.data;

    try {
      // Generate the final prompt using templates
      const finalPrompt = this.buildPrompt(type, prompt, context);

      // Merge options with template defaults
      const templateConfig =
        this.promptTemplates.get(type) || this.promptTemplates.get('custom')!;
      const finalOptions = { ...templateConfig.defaultOptions, ...options };

      // Make AI provider call
      const aiResult = await this.provider.generate(finalPrompt, finalOptions);

      // Parse and validate the result
      const parsedResult = this.parseGenerationResult(type, aiResult);

      const processingTime = Date.now() - startTime;
      const tokensUsed = aiResult.usage?.totalTokens || 0;

      const response: GenerationResponse = {
        type,
        result: parsedResult,
        raw: aiResult.text,
        metadata: {
          processingTime,
          tokensUsed,
          cost: aiResult.usage?.cost,
        },
      };

      return {
        success: true,
        text: aiResult.text,
        raw: aiResult.raw,
        usage: aiResult.usage,
        result: response,
        feature: request.feature,
        provider: 'ai_generator',
        model: options.model,
      };
    } catch (error) {
      this.logger.error(`Generation failed for type ${type}:`, error);
      throw error;
    }
  }

  protected async logUsage(
    request: AiServiceRequest<GenerationRequest>,
    response: AiServiceResponse<GenerationResponse>
  ): Promise<void> {
    await this.aiLogsService.record({
      userId: request.userId,
      storeId: request.storeId,
      feature: request.feature,
      prompt: request.data.prompt,
      details: {
        generationType: request.data.type,
        options: request.data.options,
        context: request.data.context,
        usage: response.usage,
        metadata: response.result?.metadata,
        success: response.success,
        error: response.error,
      },
    });
  }

  protected async auditRequest(
    request: AiServiceRequest<GenerationRequest>,
    response: AiServiceResponse<GenerationResponse>
  ): Promise<void> {
    await this.aiAuditService.storeEncryptedResponse({
      feature: request.feature,
      provider: 'ai_generator',
      model: request.data.options.model,
      rawResponse: {
        request: {
          type: request.data.type,
          context: request.data.context,
          options: request.data.options,
        },
        response: response.raw,
        result: response.result,
      },
      userId: request.userId,
      storeId: request.storeId,
    });
  }

  // ===============================
  // Public API Methods
  // ===============================

  /**
   * Generate product names
   */
  async generateProductNames(params: {
    storeStyle?: string;
    seed?: string;
    count?: number;
    options?: AiGenerateOptions;
    userId?: string;
    storeId?: string;
  }): Promise<string[]> {
    const {
      storeStyle,
      seed,
      count = 6,
      options = {},
      userId,
      storeId,
    } = params;

    const request: AiServiceRequest<GenerationRequest> = {
      feature: 'generator_names',
      provider: 'ai_generator',
      data: {
        type: 'name',
        prompt: 'Generate product names',
        options,
        context: { storeStyle, seed, count },
      },
      userId,
      storeId,
    };

    const response = await this.execute(request);

    if (!response.success || !response.result) {
      throw new Error(response.error || 'Name generation failed');
    }

    return response.result.result;
  }

  /**
   * Generate product description
   */
  async generateProductDescription(params: {
    name: string;
    productSpec?: string;
    tone?: string;
    options?: AiGenerateOptions;
    userId?: string;
    storeId?: string;
  }): Promise<{ title: string; description: string }> {
    const {
      name,
      productSpec,
      tone = 'friendly and professional',
      options = {},
      userId,
      storeId,
    } = params;

    const request: AiServiceRequest<GenerationRequest> = {
      feature: 'generator_description',
      provider: 'ai_generator',
      data: {
        type: 'description',
        prompt: `Generate description for ${name}`,
        options,
        context: { productSpec, tone },
      },
      userId,
      storeId,
    };

    const response = await this.execute(request);

    if (!response.success || !response.result) {
      throw new Error(response.error || 'Description generation failed');
    }

    return response.result.result;
  }

  /**
   * Generate product ideas
   */
  async generateProductIdeas(params: {
    storeStyle?: string;
    seed?: string;
    count?: number;
    options?: AiGenerateOptions;
    userId?: string;
    storeId?: string;
  }): Promise<Array<{ name: string; concept: string; rationale: string }>> {
    const {
      storeStyle,
      seed,
      count = 6,
      options = {},
      userId,
      storeId,
    } = params;

    const request: AiServiceRequest<GenerationRequest> = {
      feature: 'generator_ideas',
      provider: 'ai_generator',
      data: {
        type: 'ideas',
        prompt: 'Generate product ideas',
        options,
        context: { storeStyle, seed, count },
      },
      userId,
      storeId,
    };

    const response = await this.execute(request);

    if (!response.success || !response.result) {
      throw new Error(response.error || 'Ideas generation failed');
    }

    return response.result.result;
  }

  /**
   * Custom generation with prompt
   */
  async generateCustom(params: {
    prompt: string;
    options?: AiGenerateOptions;
    userId?: string;
    storeId?: string;
  }): Promise<string> {
    const { prompt, options = {}, userId, storeId } = params;

    const request: AiServiceRequest<GenerationRequest> = {
      feature: 'generator_custom',
      provider: 'ai_generator',
      data: {
        type: 'custom',
        prompt,
        options,
      },
      userId,
      storeId,
    };

    const response = await this.execute(request);

    if (!response.success || !response.result) {
      throw new Error(response.error || 'Custom generation failed');
    }

    return response.result.result;
  }

  // ===============================
  // Service Management Methods
  // ===============================

  /**
   * Get service health status
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    provider: any;
    rateLimiter: any;
    lastError?: string;
  }> {
    try {
      // Test the provider
      const providerHealth = (await (this.provider as any).healthCheck?.()) || {
        healthy: true,
      };

      // Get rate limiter status
      const rateLimiterStatus = this.rateLimiter.getAllStatuses();

      return {
        healthy: providerHealth.healthy,
        provider: providerHealth,
        rateLimiter: {
          activeTenants: rateLimiterStatus.size,
          // Don't expose detailed tenant info for privacy
        },
      };
    } catch (error) {
      return {
        healthy: false,
        provider: { healthy: false, error: error.message },
        rateLimiter: { error: 'Unable to check rate limiter status' },
        lastError: error.message,
      };
    }
  }

  /**
   * Get service usage statistics
   */
  async getUsageStats(
    filters: {
      storeId?: string;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    return this.aiLogsService.getUsageStats(filters);
  }

  /**
   * Get available generation types and their templates
   */
  getGenerationTypes(): Array<{
    type: string;
    description: string;
    defaultOptions: AiGenerateOptions;
  }> {
    return [
      {
        type: 'name',
        description: 'Generate catchy product names',
        defaultOptions: this.promptTemplates.get('productName')!.defaultOptions,
      },
      {
        type: 'description',
        description: 'Generate compelling product descriptions',
        defaultOptions:
          this.promptTemplates.get('productDescription')!.defaultOptions,
      },
      {
        type: 'ideas',
        description: 'Generate innovative product ideas',
        defaultOptions:
          this.promptTemplates.get('productIdeas')!.defaultOptions,
      },
      {
        type: 'custom',
        description: 'Generate custom content with your prompt',
        defaultOptions: this.promptTemplates.get('custom')!.defaultOptions,
      },
    ];
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  private buildPrompt(
    type: string,
    basePrompt: string,
    context: any = {}
  ): string {
    const templateConfig =
      this.promptTemplates.get(type === 'name' ? 'productName' : type) ||
      this.promptTemplates.get('custom')!;

    let prompt = templateConfig.template;

    // Replace template variables
    if (type === 'custom') {
      prompt = prompt.replace('{{prompt}}', basePrompt);
    } else {
      // Replace context variables
      prompt = prompt.replace(
        '{{storeStyle}}',
        context.storeStyle ? `Store style: ${context.storeStyle}.` : ''
      );
      prompt = prompt.replace(
        '{{seed}}',
        context.seed ? `Seed words: ${context.seed}.` : ''
      );
      prompt = prompt.replace('{{count}}', (context.count || 6).toString());
      prompt = prompt.replace(
        '{{productName}}',
        context.productName || 'the product'
      );
      prompt = prompt.replace(
        '{{productSpec}}',
        context.productSpec
          ? `Product specifications: ${context.productSpec}.`
          : ''
      );
      prompt = prompt.replace(
        '{{tone}}',
        context.tone || 'professional and engaging'
      );
    }

    // Clean up extra whitespace
    return prompt.replace(/\s+/g, ' ').trim();
  }

  private parseGenerationResult(type: string, aiResult: AiGenerateResult): any {
    try {
      // Try to parse as JSON first
      const jsonResult = JSON.parse(aiResult.text);

      // Validate the structure based on type
      switch (type) {
        case 'name':
          if (Array.isArray(jsonResult)) {
            return jsonResult.filter((item) => typeof item === 'string');
          }
          break;

        case 'description':
          if (jsonResult.title && jsonResult.description) {
            return {
              title: String(jsonResult.title).trim(),
              description: String(jsonResult.description).trim(),
            };
          }
          break;

        case 'ideas':
          if (Array.isArray(jsonResult)) {
            return jsonResult.filter(
              (item) =>
                item && typeof item === 'object' && item.name && item.concept
            );
          }
          break;

        default:
          return jsonResult;
      }

      // If validation fails, return the JSON result anyway
      return jsonResult;
    } catch (error) {
      // If JSON parsing fails, return raw text with structure based on type
      this.logger.warn(
        `Failed to parse JSON for type ${type}, returning raw text` + error
      );

      switch (type) {
        case 'name':
          // Try to extract names from text
          const names = aiResult.text
            .split('\n')
            .map((line) => line.replace(/^\d+\.\s*/, '').trim())
            .filter((line) => line.length > 0)
            .slice(0, 10);
          return names.length > 0 ? names : [aiResult.text];

        case 'description':
          return {
            title: aiResult.text.substring(0, 100),
            description: aiResult.text,
          };

        default:
          return aiResult.text;
      }
    }
  }
}
