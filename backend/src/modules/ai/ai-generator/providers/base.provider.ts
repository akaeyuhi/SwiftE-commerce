/* eslint-disable brace-style */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AiLogsService } from '../../ai-logs/ai-logs.service';
import { AiAuditService } from '../../ai-audit/ai-audit.service';
import {
  AiGenerateOptions,
  AiGenerateResult,
  AiProvider,
} from 'src/common/interfaces/ai/generator.interface';
import { BaseAiService } from 'src/common/abstracts/ai/base.ai.service';
import {
  AiServiceRequest,
  AiServiceResponse,
} from 'src/common/interfaces/ai/ai.interface';
import { GenerationRequest } from 'src/modules/ai/ai-generator/types';

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  defaultImageModel?: string;
  defaultImageProvider?: string;
  timeout: number;
  maxRetries: number;
  defaultProvider?: string;
}

export interface GenerationRequestData {
  prompt: string;
  options: AiGenerateOptions;
  userId?: string;
  storeId?: string;
}

/**
 * BaseAiProvider
 *
 * Abstract base class for AI providers that extends BaseAiService
 * and implements the AiProvider interface.
 *
 * Provides common functionality:
 * - Request validation and sanitization
 * - Error handling and retries
 * - Usage tracking and auditing
 * - Performance monitoring
 * - Security controls
 */
@Injectable()
export abstract class BaseAiProvider
  extends BaseAiService<GenerationRequestData, AiGenerateResult>
  implements AiProvider
{
  protected readonly logger = new Logger(this.constructor.name);
  protected abstract readonly config: ProviderConfig;

  // Rate limiting per provider
  private readonly requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly maxRequestsPerMinute = 60;

  protected constructor(
    protected readonly httpService: HttpService,
    protected readonly aiLogsService: AiLogsService,
    protected readonly aiAuditService: AiAuditService
  ) {
    super();
  }

  /**
   * Main AiProvider interface implementation
   */
  async generate(
    prompt: string,
    options: AiGenerateOptions = {},
    originalRequest: AiServiceRequest<GenerationRequest>
  ): Promise<AiGenerateResult> {
    const request: AiServiceRequest<GenerationRequestData> = {
      ...originalRequest,
      provider: this.config.name,
      model: options.model || this.config.defaultModel,
      prompt,
      data: { prompt, options },
    };

    const response = await this.execute(request);

    if (!response.success || !response.result) {
      throw new Error(response.error || 'Generation failed');
    }

    return response.result;
  }

  protected validateRequest(
    request: AiServiceRequest<GenerationRequestData>
  ): void {
    const { prompt, options } = request.data;

    // Validate prompt
    if (!prompt) {
      throw new Error('Prompt must be a non-empty string');
    }

    if (prompt.length > 8000) {
      throw new Error('Prompt exceeds maximum length of 8000 characters');
    }

    // Validate options
    if (
      options.maxTokens &&
      (options.maxTokens < 1 || options.maxTokens > 4000)
    ) {
      throw new Error('maxTokens must be between 1 and 4000');
    }

    if (
      options.temperature !== undefined &&
      (options.temperature < 0 || options.temperature > 2)
    ) {
      throw new Error('temperature must be between 0 and 2');
    }

    // Check API key
    if (!this.config.apiKey) {
      throw new Error(
        `API key not configured for provider: ${this.config.name}`
      );
    }

    // Rate limiting check
    this.checkRateLimit();
  }

  protected async processRequest(
    request: AiServiceRequest<GenerationRequestData>
  ): Promise<AiServiceResponse<AiGenerateResult>> {
    const startTime = Date.now();

    try {
      // Sanitize prompt
      const sanitizedPrompt = this.sanitizePrompt(request.data.prompt);

      // Make API call
      const result = await this.makeApiCall(
        sanitizedPrompt,
        request.data.options
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        text: result.text,
        raw: result.raw,
        usage: result.usage,
        result,
        feature: request.feature,
        provider: this.config.name,
        model: request.model,
        metadata: {
          processingTime,
          sanitized: sanitizedPrompt !== request.data.prompt,
        },
        finishReason: result.finishReason,
      };
    } catch (error) {
      this.logger.error(`${this.config.name} API call failed:`, error);
      throw new Error(`${this.config.name} request failed: ${error.message}`);
    }
  }

  protected async logUsage(
    request: AiServiceRequest<GenerationRequestData>,
    response: AiServiceResponse<AiGenerateResult>
  ): Promise<void> {
    await this.aiLogsService.record({
      userId: request.userId,
      storeId: request.storeId,
      feature: request.feature,
      prompt: request.data.prompt,
      details: {
        provider: this.config.name,
        model: request.model,
        options: request.data.options,
        usage: response.usage,
        success: response.success,
        error: response.error,
        processingTime: response.metadata?.processingTime,
      },
    });
  }

  protected async auditRequest(
    request: AiServiceRequest<GenerationRequestData>,
    response: AiServiceResponse<AiGenerateResult>
  ): Promise<void> {
    await this.aiAuditService.storeEncryptedResponse({
      feature: request.feature,
      provider: this.config.name,
      model: request.model,
      rawResponse: response.raw || response.result,
      userId: request.userId,
      storeId: request.storeId,
    });
  }

  /**
   * Abstract method for provider-specific API calls
   */
  protected abstract makeApiCall(
    prompt: string,
    options: AiGenerateOptions
  ): Promise<AiGenerateResult>;

  /**
   * Health check for the provider
   */
  async healthCheck(
    userId: string,
    storeId: string
  ): Promise<{
    healthy: boolean;
    provider: string;
    model: string;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      await this.generate(
        'Hello',
        {
          maxTokens: 10,
          temperature: 0.1,
        },
        {
          feature: 'healthCheck',
          data: undefined!,
          userId,
          storeId,
        }
      );

      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        provider: this.config.name,
        model: this.config.defaultModel,
        responseTime,
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.config.name,
        model: this.config.defaultModel,
        error: error.message,
      };
    }
  }

  /**
   * Get provider configuration info (safe for logging)
   */
  getProviderInfo(): {
    name: string;
    model: string;
    hasApiKey: boolean;
    baseUrl: string;
  } {
    return {
      name: this.config.name,
      model: this.config.defaultModel,
      hasApiKey: !!this.config.apiKey,
      baseUrl: this.config.baseUrl,
    };
  }

  private sanitizePrompt(prompt: string): string {
    // Remove potentially harmful content
    let sanitized = prompt;

    // Remove script tags and similar
    sanitized = sanitized.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    );
    sanitized = sanitized.replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      ''
    );

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Limit length
    if (sanitized.length > 8000) {
      sanitized = sanitized.substring(0, 7997) + '...';
    }

    return sanitized;
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const key = this.config.name;
    const current = this.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      // Reset or initialize
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + this.rateLimitWindow,
      });
      return;
    }

    if (current.count >= this.maxRequestsPerMinute) {
      throw new Error(`Rate limit exceeded for provider ${this.config.name}`);
    }

    current.count++;
  }
}
