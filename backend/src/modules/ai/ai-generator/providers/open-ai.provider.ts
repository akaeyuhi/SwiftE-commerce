import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { BaseAiProvider, ProviderConfig } from './base.provider';
import { AiLogsService } from '../../ai-logs/ai-logs.service';
import { AiAuditService } from '../../ai-audit/ai-audit.service';
import {
  AiGenerateOptions,
  AiGenerateResult,
} from 'src/common/interfaces/ai/generator.interface';

/**
 * OpenAI Provider
 *
 * Supports multiple OpenAI models with proper error handling,
 * cost tracking, and comprehensive monitoring.
 */
@Injectable()
export class OpenAiProvider extends BaseAiProvider {
  protected readonly config: ProviderConfig = {
    name: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo',
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
  };

  // Pricing per 1K tokens (update as needed)
  private readonly modelPricing = new Map([
    ['gpt-3.5-turbo', { input: 0.0015, output: 0.002 }],
    ['gpt-3.5-turbo-16k', { input: 0.003, output: 0.004 }],
    ['gpt-4', { input: 0.03, output: 0.06 }],
    ['gpt-4-32k', { input: 0.06, output: 0.12 }],
    ['text-davinci-003', { input: 0.02, output: 0.02 }],
    ['text-curie-001', { input: 0.002, output: 0.002 }],
  ]);

  // Model capabilities
  private readonly modelConfigs = new Map([
    ['gpt-3.5-turbo', { maxTokens: 4096, type: 'chat' }],
    ['gpt-3.5-turbo-16k', { maxTokens: 16384, type: 'chat' }],
    ['gpt-4', { maxTokens: 8192, type: 'chat' }],
    ['gpt-4-32k', { maxTokens: 32768, type: 'chat' }],
    ['text-davinci-003', { maxTokens: 4000, type: 'completion' }],
    ['text-curie-001', { maxTokens: 2048, type: 'completion' }],
  ]);

  constructor(
    httpService: HttpService,
    aiLogsService: AiLogsService,
    aiAuditService: AiAuditService
  ) {
    super(httpService, aiLogsService, aiAuditService);
  }

  protected async makeApiCall(
    prompt: string,
    options: AiGenerateOptions
  ): Promise<AiGenerateResult> {
    const model = options.model || this.config.defaultModel;
    const modelConfig = this.modelConfigs.get(model);

    if (!modelConfig) {
      throw new Error(`Unsupported OpenAI model: ${model}`);
    }

    const endpoint =
      modelConfig.type === 'chat' ? 'chat/completions' : 'completions';
    const url = `${this.config.baseUrl}/${endpoint}`;

    const payload = this.buildPayload(prompt, options, model, modelConfig);
    const headers = this.buildHeaders();

    try {
      const response$ = this.httpService.post(url, payload, {
        headers,
        timeout: this.config.timeout,
      });

      const response = await lastValueFrom(response$);
      return this.parseResponse(response.data, model);
    } catch (error) {
      this.handleApiError(error, model);
      throw error;
    }
  }

  private buildPayload(
    prompt: string,
    options: AiGenerateOptions,
    model: string,
    modelConfig: { maxTokens: number; type: string }
  ) {
    const maxTokens = Math.min(
      options.maxTokens || 256,
      Math.floor(modelConfig.maxTokens * 0.8) // Leave room for prompt
    );

    if (modelConfig.type === 'chat') {
      return {
        model,
        messages: [{ role: 'user', content: prompt }],
        /* eslint-disable camelcase */
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.7,
        n: 1,
        stream: false,
        stop: options.stop,
        presence_penalty: 0,
        frequency_penalty: 0,
      };
    } else {
      return {
        model,
        prompt,
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.7,
        n: 1,
        stream: false,
        stop: options.stop,
        echo: false,
      };
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Generator-Service/1.0',
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private parseResponse(data: any, model: string): AiGenerateResult {
    let text: string;

    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No choices in OpenAI response');
    }

    try {
      // Extract text based on model type
      text = choice.message?.content || choice.text || '';

      // Calculate costs
      const usage = data.usage || {};
      const pricing = this.modelPricing.get(model) || { input: 0, output: 0 };

      const cost = this.calculateCost(usage, pricing);

      return {
        text: text.trim(),
        raw: data,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
          cost,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse OpenAI response:', error);
      throw new Error('Invalid response format from OpenAI');
    }
  }

  private calculateCost(
    usage: any,
    pricing: { input: number; output: number }
  ): number {
    const inputCost = ((usage.prompt_tokens || 0) / 1000) * pricing.input;
    const outputCost = ((usage.completion_tokens || 0) / 1000) * pricing.output;
    return Number((inputCost + outputCost).toFixed(6));
  }

  private handleApiError(error: any, model: string): void {
    const status = error.response?.status;
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message;
    const errorType = errorData?.type;

    switch (status) {
      case 401:
        this.logger.error('OpenAI API key is invalid');
        break;
      case 429:
        if (errorType === 'insufficient_quota') {
          this.logger.error('OpenAI quota exceeded');
        } else {
          this.logger.warn(`OpenAI rate limit exceeded for model ${model}`);
        }
        break;
      case 400:
        this.logger.error(`OpenAI bad request for model ${model}: ${message}`);
        break;
      case 404:
        this.logger.error(`OpenAI model ${model} not found`);
        break;
      case 500:
      case 502:
      case 503:
        this.logger.warn(`OpenAI server error (${status}): ${message}`);
        break;
      default:
        this.logger.error(`OpenAI API error (${status}): ${message}`);
    }
  }

  /**
   * Get available models for this provider
   */
  getAvailableModels(): string[] {
    return Array.from(this.modelConfigs.keys());
  }

  /**
   * Check if model is supported
   */
  isModelSupported(model: string): boolean {
    return this.modelConfigs.has(model);
  }

  /**
   * Get model pricing information
   */
  getModelPricing(model: string): { input: number; output: number } | null {
    return this.modelPricing.get(model) || null;
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = this.getModelPricing(model);
    if (!pricing) return 0;

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return Number((inputCost + outputCost).toFixed(6));
  }
}
