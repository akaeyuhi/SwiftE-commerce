import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  createMock,
  createServiceMock,
  MockedMethods,
} from 'test/unit/helpers';
import { OpenAiProvider } from 'src/modules/ai/ai-generator/providers/open-ai.provider';

describe('OpenAiProvider', () => {
  let provider: OpenAiProvider;
  let httpService: Partial<MockedMethods<HttpService>>;
  let aiLogsService: Partial<MockedMethods<AiLogsService>>;
  let aiAuditService: Partial<MockedMethods<AiAuditService>>;

  beforeEach(async () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';

    httpService = createMock<HttpService>(['post']);
    aiLogsService = createServiceMock<AiLogsService>(['record']);
    aiAuditService = createMock<AiAuditService>(['storeEncryptedResponse']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiProvider,
        { provide: HttpService, useValue: httpService },
        { provide: AiLogsService, useValue: aiLogsService },
        { provide: AiAuditService, useValue: aiAuditService },
      ],
    }).compile();

    provider = module.get<OpenAiProvider>(OpenAiProvider);

    jest.clearAllMocks();
  });

  describe('makeApiCall', () => {
    it('should make successful API call for chat model', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          choices: [{ message: { content: 'Generated response' } }],
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post!.mockReturnValue(of(mockResponse) as any);

      const result = await (provider as any).makeApiCall('Test prompt', {
        model: 'gpt-3.5-turbo',
      });

      expect(result.text).toBe('Generated response');
      expect(result.usage.totalTokens).toBe(30);
      expect(result.usage.cost).toBeDefined();
    });

    it('should make successful API call for completion model', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          choices: [{ text: 'Completion response' }],
          usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post!.mockReturnValue(of(mockResponse) as any);

      const result = await (provider as any).makeApiCall('Test prompt', {
        model: 'text-davinci-003',
      });

      expect(result.text).toBe('Completion response');
      expect(result.usage.totalTokens).toBe(40);
    });

    it('should throw error for unsupported model', async () => {
      await expect(
        (provider as any).makeApiCall('Test prompt', { model: 'unknown-model' })
      ).rejects.toThrow('Unsupported OpenAI model');
    });

    it('should use default model when not specified', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          choices: [{ message: { content: 'Response' } }],
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post!.mockReturnValue(of(mockResponse) as any);

      await (provider as any).makeApiCall('Test prompt', {});

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('chat/completions'),
        expect.objectContaining({ model: 'gpt-3.5-turbo' }),
        expect.any(Object)
      );
    });
  });

  describe('buildPayload', () => {
    it('should build payload for chat model', () => {
      const modelConfig = { maxTokens: 4096, type: 'chat' };
      const options = { maxTokens: 512, temperature: 0.8, stop: ['\n'] };

      const payload = (provider as any).buildPayload(
        'Test prompt',
        options,
        'gpt-3.5-turbo',
        modelConfig
      );

      expect(payload.model).toBe('gpt-3.5-turbo');
      expect(payload.messages).toEqual([
        { role: 'user', content: 'Test prompt' },
      ]);
      expect(payload.maxTokens).toBe(512);
      expect(payload.temperature).toBe(0.8);
      expect(payload.stop).toEqual(['\n']);
      expect(payload.stream).toBe(false);
    });

    it('should build payload for completion model', () => {
      const modelConfig = { maxTokens: 4000, type: 'completion' };
      const options = { maxTokens: 256 };

      const payload = (provider as any).buildPayload(
        'Test prompt',
        options,
        'text-davinci-003',
        modelConfig
      );

      expect(payload.model).toBe('text-davinci-003');
      expect(payload.prompt).toBe('Test prompt');
      expect(payload.maxTokens).toBe(256);
      expect(payload.echo).toBe(false);
    });

    it('should limit max tokens to 80% of model capacity', () => {
      const modelConfig = { maxTokens: 1000, type: 'chat' };
      const options = { maxTokens: 900 }; // Would exceed 80%

      const payload = (provider as any).buildPayload(
        'Test prompt',
        options,
        'gpt-3.5-turbo',
        modelConfig
      );

      expect(payload.maxTokens).toBe(800); // 80% of 1000
    });

    it('should use default temperature when not provided', () => {
      const modelConfig = { maxTokens: 4096, type: 'chat' };

      const payload = (provider as any).buildPayload(
        'Test prompt',
        {},
        'gpt-3.5-turbo',
        modelConfig
      );

      expect(payload.temperature).toBe(0.7);
    });
  });

  describe('buildHeaders', () => {
    it('should build headers with API key', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const headers = (provider as any).buildHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer sk-test-key');
      expect(headers['User-Agent']).toBeDefined();
    });

    it('should build headers without API key when not configured', () => {
      const originalApiKey = (provider as any).config.apiKey;
      (provider as any).config.apiKey = undefined;

      const headers = (provider as any).buildHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();

      (provider as any).config.apiKey = originalApiKey;
    });
  });

  describe('parseResponse', () => {
    it('should parse chat model response', () => {
      const data = {
        choices: [{ message: { content: 'Chat response' } }],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      };

      const result = (provider as any).parseResponse(data, 'gpt-3.5-turbo');

      expect(result.text).toBe('Chat response');
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(20);
      expect(result.usage.totalTokens).toBe(30);
      expect(result.usage.cost).toBeDefined();
    });

    it('should parse completion model response', () => {
      const data = {
        choices: [{ text: 'Completion response' }],
        usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 },
      };

      const result = (provider as any).parseResponse(data, 'text-davinci-003');

      expect(result.text).toBe('Completion response');
      expect(result.usage.totalTokens).toBe(40);
    });

    it('should throw error when no choices in response', () => {
      const data = { choices: [] };

      expect(() =>
        (provider as any).parseResponse(data, 'gpt-3.5-turbo')
      ).toThrow('No choices in OpenAI response');
    });

    it('should handle missing usage data', () => {
      const data = {
        choices: [{ message: { content: 'Response' } }],
      };

      const result = (provider as any).parseResponse(data, 'gpt-3.5-turbo');

      expect(result.usage.promptTokens).toBe(0);
      expect(result.usage.completionTokens).toBe(0);
      expect(result.usage.totalTokens).toBe(0);
    });

    it('should trim response text', () => {
      const data = {
        choices: [{ message: { content: '  Response with spaces  ' } }],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      };

      const result = (provider as any).parseResponse(data, 'gpt-3.5-turbo');

      expect(result.text).toBe('Response with spaces');
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly', () => {
      const usage = { promptTokens: 1000, completionTokens: 2000 };
      const pricing = { input: 0.0015, output: 0.002 };

      const cost = (provider as any).calculateCost(usage, pricing);

      // (1000/1000 * 0.0015) + (2000/1000 * 0.002) = 0.0015 + 0.004 = 0.0055
      expect(cost).toBeCloseTo(0.0055, 6);
    });

    it('should handle missing token counts', () => {
      const usage = {};
      const pricing = { input: 0.0015, output: 0.002 };

      const cost = (provider as any).calculateCost(usage, pricing);

      expect(cost).toBe(0);
    });

    it('should round to 6 decimal places', () => {
      const usage = { promptTokens: 333, completionTokens: 666 };
      const pricing = { input: 0.0015, output: 0.002 };

      const cost = (provider as any).calculateCost(usage, pricing);

      expect(cost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
    });
  });

  describe('handleApiError', () => {
    it('should log 401 authentication error', () => {
      const error = {
        response: { status: 401, data: { error: { message: 'Invalid key' } } },
      };
      const logSpy = jest.spyOn((provider as any).logger, 'error');

      (provider as any).handleApiError(error, 'gpt-3.5-turbo');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API key is invalid')
      );
    });

    it('should log 429 rate limit error', () => {
      const error = {
        response: {
          status: 429,
          data: { error: { type: 'rate_limit', message: 'Rate limit' } },
        },
      };
      const logSpy = jest.spyOn((provider as any).logger, 'warn');

      (provider as any).handleApiError(error, 'gpt-3.5-turbo');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('rate limit')
      );
    });

    it('should log quota exceeded error', () => {
      const error = {
        response: {
          status: 429,
          data: { error: { type: 'insufficient_quota', message: 'No quota' } },
        },
      };
      const logSpy = jest.spyOn((provider as any).logger, 'error');

      (provider as any).handleApiError(error, 'gpt-4');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('quota exceeded')
      );
    });

    it('should log 400 bad request error', () => {
      const error = {
        response: {
          status: 400,
          data: { error: { message: 'Bad request' } },
        },
      };
      const logSpy = jest.spyOn((provider as any).logger, 'error');

      (provider as any).handleApiError(error, 'gpt-3.5-turbo');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('bad request')
      );
    });

    it('should log 404 model not found error', () => {
      const error = {
        response: {
          status: 404,
          data: { error: { message: 'Model not found' } },
        },
      };
      const logSpy = jest.spyOn((provider as any).logger, 'error');

      (provider as any).handleApiError(error, 'unknown-model');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    it('should log server errors', () => {
      const error = {
        response: {
          status: 503,
          data: { error: { message: 'Service unavailable' } },
        },
      };
      const logSpy = jest.spyOn((provider as any).logger, 'warn');

      (provider as any).handleApiError(error, 'gpt-3.5-turbo');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('server error')
      );
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', () => {
      const models = provider.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models).toContain('gpt-3.5-turbo');
      expect(models).toContain('gpt-4');
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('isModelSupported', () => {
    it('should return true for supported models', () => {
      expect(provider.isModelSupported('gpt-3.5-turbo')).toBe(true);
      expect(provider.isModelSupported('gpt-4')).toBe(true);
      expect(provider.isModelSupported('text-davinci-003')).toBe(true);
    });

    it('should return false for unsupported models', () => {
      expect(provider.isModelSupported('unknown-model')).toBe(false);
      expect(provider.isModelSupported('gpt-5')).toBe(false);
    });
  });

  describe('getModelPricing', () => {
    it('should return pricing for supported models', () => {
      const pricing = provider.getModelPricing('gpt-3.5-turbo');

      expect(pricing).not.toBeNull();
      expect(pricing?.input).toBeDefined();
      expect(pricing?.output).toBeDefined();
      expect(pricing?.input).toBeGreaterThan(0);
    });

    it('should return null for unsupported models', () => {
      const pricing = provider.getModelPricing('unknown-model');

      expect(pricing).toBeNull();
    });

    it('should have different pricing for different models', () => {
      const gpt35Pricing = provider.getModelPricing('gpt-3.5-turbo');
      const gpt4Pricing = provider.getModelPricing('gpt-4');

      expect(gpt4Pricing?.input).toBeGreaterThan(gpt35Pricing?.input || 0);
      expect(gpt4Pricing?.output).toBeGreaterThan(gpt35Pricing?.output || 0);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost correctly', () => {
      const cost = provider.estimateCost('gpt-3.5-turbo', 1000, 2000);

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01); // Should be reasonable
    });

    it('should return 0 for unknown model', () => {
      const cost = provider.estimateCost('unknown-model', 1000, 2000);

      expect(cost).toBe(0);
    });

    it('should scale with token count', () => {
      const cost1 = provider.estimateCost('gpt-3.5-turbo', 100, 100);
      const cost2 = provider.estimateCost('gpt-3.5-turbo', 1000, 1000);

      expect(cost2).toBeGreaterThan(cost1 * 5); // Should be roughly 10x
    });

    it('should account for different input/output prices', () => {
      const inputOnlyCost = provider.estimateCost('gpt-3.5-turbo', 1000, 0);
      const outputOnlyCost = provider.estimateCost('gpt-3.5-turbo', 0, 1000);

      expect(inputOnlyCost).toBeGreaterThan(0);
      expect(outputOnlyCost).toBeGreaterThan(0);
      expect(outputOnlyCost).toBeGreaterThan(inputOnlyCost); // Output usually costs more
    });
  });
});
