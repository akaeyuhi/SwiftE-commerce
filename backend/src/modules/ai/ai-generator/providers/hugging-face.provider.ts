import { Injectable } from '@nestjs/common';
import { InferenceClient } from '@huggingface/inference';
import { ConfigService } from '@nestjs/config';
import { BaseAiProvider, ProviderConfig } from './base.provider';
import { AiLogsService } from '../../ai-logs/ai-logs.service';
import { AiAuditService } from '../../ai-audit/ai-audit.service';
import {
  AiGenerateOptions,
  AiGenerateResult,
} from 'src/common/interfaces/ai/generator.interface';
import { huggingFaceModelConfigs } from 'src/modules/ai/ai-generator/providers/configs';
import { HttpService } from '@nestjs/axios';

/**
 * HuggingFace Provider using InferenceClient
 *
 * Supports chat completions via Hugging Face Router with multiple providers
 */
@Injectable()
export class HuggingFaceProvider extends BaseAiProvider {
  private client: InferenceClient;

  protected readonly config: ProviderConfig = {} as ProviderConfig;

  private readonly modelConfigs = huggingFaceModelConfigs;

  constructor(
    private readonly configService: ConfigService,
    protected readonly httpService: HttpService,
    protected readonly aiLogsService: AiLogsService,
    protected readonly aiAuditService: AiAuditService
  ) {
    super(httpService, aiLogsService, aiAuditService);

    this.config = {
      name: 'huggingface',
      apiKey: this.configService.get<string>('HF_API_KEY'),
      baseUrl:
        this.configService.get<string>('HF_BASE_URL') ||
        'https://router.huggingface.co/v1/chat/completions',
      defaultModel:
        configService.get<string>('HF_DEFAULT_MODEL') || 'openai/gpt-oss-20b',
      defaultProvider:
        configService.get<string>('HF_DEFAULT_PROVIDER') || 'fireworks-ai',
      timeout: parseInt(configService.get<string>('HF_TIMEOUT') || '120000'),
      maxRetries: parseInt(configService.get<string>('HF_MAX_RETRIES') || '3'),
    };

    this.client = new InferenceClient(this.config.apiKey);
  }

  protected async makeApiCall(
    prompt: string,
    options: AiGenerateOptions
  ): Promise<AiGenerateResult> {
    const model = options.model || this.config.defaultModel;
    const provider = options.provider || this.config.defaultProvider;

    try {
      const chatCompletion = await this.client.chatCompletion({
        provider: provider as any, // e.g., 'fireworks-ai', 'together-ai', 'nebius'
        model,
        messages: [
          {
            role: 'system',
            content:
              options.systemPrompt ||
              'You are a helpful AI assistant for e-commerce product generation.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options.temperature ?? 0.7,
        stop: options.stop!,
      });

      return this.parseResponse(chatCompletion);
    } catch (error) {
      this.handleApiError(error, model, provider);
      throw error;
    }
  }

  private parseResponse(chatCompletion: any): AiGenerateResult {
    const choice = chatCompletion.choices?.[0];
    const message = choice?.message;

    if (!message?.content) {
      throw new Error('No content in chat completion response');
    }

    return {
      text: message.content.trim(),
      raw: chatCompletion,
      usage: {
        promptTokens: chatCompletion.usage?.prompt_tokens || 0,
        completionTokens: chatCompletion.usage?.completion_tokens || 0,
        totalTokens: chatCompletion.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason,
    };
  }

  private handleApiError(error: any, model: string, provider: string): void {
    const status = error.response?.status || error.statusCode;
    const message = error.message || 'Unknown error';

    this.logger.error(
      `HuggingFace API error (${provider}/${model}): ${status} - ${message}`
    );

    switch (status) {
      case 401:
        this.logger.error('HuggingFace API key invalid or missing');
        break;
      case 429:
        this.logger.warn(
          `Rate limit exceeded for ${provider}/${model}, consider switching provider`
        );
        break;
      case 503:
        this.logger.warn(`Model ${model} unavailable on ${provider}`);
        break;
      default:
        this.logger.error(`API call failed: ${message}`);
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

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return ['fireworks-ai', 'together-ai', 'nebius', 'deepinfra', 'hyperbolic'];
  }
}
