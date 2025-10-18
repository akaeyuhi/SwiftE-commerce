import { Injectable, Logger } from '@nestjs/common';
import {
  AiServiceRequest,
  AiServiceResponse,
} from 'src/common/interfaces/ai/ai.interface';

/**
 * BaseAiService
 *
 * Abstract service for AI operations aligned with existing AI interfaces.
 * Provides common patterns for request processing, logging, and auditing.
 */
@Injectable()
export abstract class BaseAiService<RequestData = any, ResponseData = any> {
  protected readonly logger = new Logger(this.constructor.name);

  protected readonly maxRetries: number = 3;
  protected readonly requestTimeout: number = 30000;

  /**
   * Process AI request - must be implemented by subclasses
   */
  protected abstract processRequest(
    request: AiServiceRequest<RequestData>
  ): Promise<AiServiceResponse<ResponseData>>;

  /**
   * Validate request before processing
   */
  protected abstract validateRequest(
    request: AiServiceRequest<RequestData>
  ): void;

  /**
   * Log AI usage
   */
  protected abstract logUsage(
    request: AiServiceRequest<RequestData>,
    response: AiServiceResponse<ResponseData>
  ): Promise<void>;

  /**
   * Create audit trail
   */
  protected abstract auditRequest(
    request: AiServiceRequest<RequestData>,
    response: AiServiceResponse<ResponseData>
  ): Promise<void>;

  /**
   * Execute AI request with a full pipeline
   */
  async execute(
    request: AiServiceRequest<RequestData>
  ): Promise<AiServiceResponse<ResponseData>> {
    try {
      this.validateRequest(request);

      let response: AiServiceResponse<ResponseData> | null = null;

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          response = await this.processRequest(request);

          if (response.success) {
            break;
          } else {
            throw new Error(response.error || 'AI request failed');
          }
        } catch (error) {
          if (attempt === this.maxRetries) {
            throw error;
          }
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      }

      if (!response) {
        throw new Error('No response received from AI service');
      }

      // Update usage info
      response.usage = {
        ...response.usage,
        totalTokens: response.usage?.totalTokens || 0,
      };

      // Log and audit (async, non-blocking)
      this.logUsage(request, response).catch((error) =>
        this.logger.warn('Failed to log AI usage:', error)
      );

      this.auditRequest(request, response).catch((error) =>
        this.logger.warn('Failed to audit AI request:', error)
      );

      return response;
    } catch (error) {
      const errorResponse: AiServiceResponse<ResponseData> = {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : String(error),
        feature: request.feature,
        provider: request.provider || 'unknown',
        model: request.model,
        finishReason: error.finishReason,
      };

      // Log failed request
      this.logUsage(request, errorResponse).catch(() => {});
      this.auditRequest(request, errorResponse).catch(() => {});

      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
