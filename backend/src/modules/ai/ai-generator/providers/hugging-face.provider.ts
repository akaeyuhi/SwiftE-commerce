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
 * HuggingFace Provider
 *
 * Supports multiple HuggingFace models with proper error handling,
 * retry logic, and comprehensive monitoring.
 */
@Injectable()
export class HuggingFaceProvider extends BaseAiProvider {
  protected readonly config: ProviderConfig = {
    name: 'huggingface',
    apiKey: process.env.HF_API_KEY,
    baseUrl: 'https://api-inference.huggingface.co/models',
    defaultModel: process.env.HF_DEFAULT_MODEL || 'microsoft/DialoGPT-medium',
    timeout: parseInt(process.env.HF_TIMEOUT || '120000'),
    maxRetries: parseInt(process.env.HF_MAX_RETRIES || '3'),
  };

  // Model-specific configurations
  private readonly modelConfigs = new Map([
    ['gpt2', { type: 'text-generation', maxTokens: 1024 }],
    ['microsoft/DialoGPT-medium', { type: 'text-generation', maxTokens: 512 }],
    [
      'facebook/blenderbot-400M-distill',
      { type: 'text2text-generation', maxTokens: 256 },
    ],
    ['google/flan-t5-small', { type: 'text2text-generation', maxTokens: 512 }],
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
    const modelConfig = this.modelConfigs.get(model) || {
      type: 'text-generation',
      maxTokens: 512,
    };

    const url = `${this.config.baseUrl}/${model}`;

    const payload = this.buildPayload(prompt, options, modelConfig);
    const headers = this.buildHeaders();

    try {
      const response$ = this.httpService.post(url, payload, {
        headers,
        timeout: this.config.timeout,
      });

      const response = await lastValueFrom(response$);
      return this.parseResponse(response.data, payload);
    } catch (error) {
      this.handleApiError(error, model);
      throw error; // Re-throw after logging
    }
  }

  private buildPayload(
    prompt: string,
    options: AiGenerateOptions,
    modelConfig: { type: string; maxTokens: number }
  ) {
    const maxTokens = Math.min(options.maxTokens || 256, modelConfig.maxTokens);

    const payload: any = {
      inputs: prompt,
      parameters: {
        /* eslint-disable camelcase */
        max_new_tokens: maxTokens,
        temperature: options.temperature ?? 0.7,
        do_sample: true,
        pad_token_id: 50256, // Standard padding token
      },
      options: {
        wait_for_model: true,
        use_cache: false,
      },
    };

    // Add model-specific parameters
    if (modelConfig.type === 'text-generation') {
      payload.parameters.return_full_text = false;
      if (options.stop) {
        payload.parameters.stop_sequences = Array.isArray(options.stop)
          ? options.stop
          : [options.stop];
      }
    }

    return payload;
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

  private parseResponse(data: any, originalPayload: any): AiGenerateResult {
    let text: string;
    let usage = {};

    try {
      // Handle different response formats from HuggingFace
      if (Array.isArray(data) && data.length > 0) {
        // Check for translation first
        if (data[0].translation_text !== undefined) {
          text = data[0].translation_text;
        } else if (data[0].generated_text !== undefined) {
          text = data[0].generated_text;
        } else if (typeof data[0] === 'string') {
          text = data[0];
        } else {
          text = JSON.stringify(data);
        }
      } else if (data.generated_text !== undefined) {
        text = data.generated_text;
      } else if (typeof data === 'string') {
        text = data;
      } else {
        // Fallback
        text = JSON.stringify(data).substring(0, 2048);
      }

      // Clean up the text
      text = this.cleanGeneratedText(text, originalPayload.inputs);

      // Estimate usage (HuggingFace doesn't provide token counts)
      usage = this.estimateUsage(originalPayload.inputs, text);
    } catch (error) {
      this.logger.warn(
        'Failed to parse HuggingFace response, using raw data' + error
      );
      text = JSON.stringify(data).substring(0, 1000);
    }

    return {
      text: text.trim(),
      raw: data,
      usage,
    };
  }

  private cleanGeneratedText(text: string, originalPrompt: string): string {
    let cleaned = text;

    // Remove the original prompt if it's repeated
    if (cleaned.startsWith(originalPrompt)) {
      cleaned = cleaned.substring(originalPrompt.length).trim();
    }

    // Remove common artifacts
    cleaned = cleaned.replace(/^[:\-\s]+/, ''); // Leading punctuation
    cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces
    cleaned = cleaned.trim();

    return cleaned;
  }

  private estimateUsage(prompt: string, generated: string) {
    // Rough estimation: ~4 characters per token
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(generated.length / 4);

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  private handleApiError(error: any, model: string): void {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;

    switch (status) {
      case 401:
        this.logger.error(`HuggingFace API key invalid or missing`);
        break;
      case 429:
        this.logger.warn(`HuggingFace rate limit exceeded for model ${model}`);
        break;
      case 503:
        this.logger.warn(`HuggingFace model ${model} is loading, retrying...`);
        break;
      default:
        this.logger.error(`HuggingFace API error (${status}): ${message}`);
    }
  }

  /**
   * Get available models for this provider
   */
  getAvailableModels(): string[] {
    return Array.from(this.modelConfigs.keys());
  }

  /**
   * Validate if a model is supported
   */
  isModelSupported(model: string): boolean {
    return this.modelConfigs.has(model);
  }
}
