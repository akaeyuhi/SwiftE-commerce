import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  createMock,
  createServiceMock,
  MockedMethods,
} from 'test/utils/helpers';
import { HuggingFaceProvider } from 'src/modules/ai/ai-generator/providers/hugging-face.provider';

describe('HuggingFaceProvider', () => {
  let provider: HuggingFaceProvider;
  let httpService: Partial<MockedMethods<HttpService>>;
  let aiLogsService: Partial<MockedMethods<AiLogsService>>;
  let aiAuditService: Partial<MockedMethods<AiAuditService>>;

  beforeEach(async () => {
    process.env.HF_API_KEY = 'test-api-key';
    httpService = createMock<HttpService>(['post']);
    aiLogsService = createServiceMock<AiLogsService>(['record']);
    aiAuditService = createMock<AiAuditService>(['storeEncryptedResponse']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HuggingFaceProvider,
        { provide: HttpService, useValue: httpService },
        { provide: AiLogsService, useValue: aiLogsService },
        { provide: AiAuditService, useValue: aiAuditService },
      ],
    }).compile();

    provider = module.get<HuggingFaceProvider>(HuggingFaceProvider);

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.HF_API_KEY;
  });

  describe('makeApiCall', () => {
    it('should make successful API call', async () => {
      const mockResponse: AxiosResponse = {
        data: [{ generatedText: 'Generated response' }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post!.mockReturnValue(of(mockResponse) as any);

      const result = await (provider as any).makeApiCall('Test prompt', {
        model: 'gpt2',
      });

      expect(result.text).toBe('Generated response');
      expect(result.usage).toBeDefined();
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should use default model when not specified', async () => {
      const mockResponse: AxiosResponse = {
        data: [{ generatedText: 'Response' }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post!.mockReturnValue(of(mockResponse) as any);

      await (provider as any).makeApiCall('Test prompt', {});

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('microsoft/DialoGPT-medium'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const error = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
        message: 'Request failed',
      };

      httpService.post!.mockReturnValue(throwError(() => error) as any);

      await expect(
        (provider as any).makeApiCall('Test prompt', {})
      ).rejects.toBeDefined();
    });
  });

  describe('buildPayload', () => {
    it('should build payload for text-generation model', () => {
      const modelConfig = { type: 'text-generation', maxTokens: 1024 };
      const options = { maxTokens: 512, temperature: 0.8 };

      const payload = (provider as any).buildPayload(
        'Test prompt',
        options,
        modelConfig
      );

      expect(payload.inputs).toBe('Test prompt');
      expect(payload.parameters.maxNewTokens).toBe(512);
      expect(payload.parameters.temperature).toBe(0.8);
      expect(payload.parameters.returnFullText).toBe(false);
      expect(payload.options.waitForModel).toBe(true);
    });

    it('should limit max tokens to model maximum', () => {
      const modelConfig = { type: 'text-generation', maxTokens: 256 };
      const options = { maxTokens: 1000 }; // Exceeds model max

      const payload = (provider as any).buildPayload(
        'Test prompt',
        options,
        modelConfig
      );

      expect(payload.parameters.maxNewTokens).toBe(256);
    });

    it('should add stop sequences for text-generation', () => {
      const modelConfig = { type: 'text-generation', maxTokens: 512 };
      const options = { stop: ['\n', '###'] };

      const payload = (provider as any).buildPayload(
        'Test prompt',
        options,
        modelConfig
      );

      expect(payload.parameters.stopSequences).toEqual(['\n', '###']);
    });

    it('should handle single stop string', () => {
      const modelConfig = { type: 'text-generation', maxTokens: 512 };
      const options = { stop: '\n' };

      const payload = (provider as any).buildPayload(
        'Test prompt',
        options,
        modelConfig
      );

      expect(payload.parameters.stopSequences).toEqual(['\n']);
    });

    it('should use default temperature', () => {
      const modelConfig = { type: 'text-generation', maxTokens: 512 };

      const payload = (provider as any).buildPayload(
        'Test prompt',
        {},
        modelConfig
      );

      expect(payload.parameters.temperature).toBe(0.7);
    });
  });

  describe('buildHeaders', () => {
    it('should build headers with API key', () => {
      process.env.HF_API_KEY = 'test-api-key';

      const headers = (provider as any).buildHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer test-api-key');
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
    it('should parse array response with generated_text', () => {
      const data = [{ generatedText: 'Generated output' }];
      const payload = { inputs: 'Original prompt' };

      const result = (provider as any).parseResponse(data, payload);

      expect(result.text).toBe('Generated output');
      expect(result.raw).toEqual(data);
      expect(result.usage).toBeDefined();
    });

    it('should parse object response with generated_text', () => {
      const data = { generatedText: 'Generated output' };
      const payload = { inputs: 'Original prompt' };

      const result = (provider as any).parseResponse(data, payload);

      expect(result.text).toBe('Generated output');
    });

    it('should parse string array response', () => {
      const data = ['Generated output'];
      const payload = { inputs: 'Original prompt' };

      const result = (provider as any).parseResponse(data, payload);

      expect(result.text).toBe('Generated output');
    });

    it('should parse translation response', () => {
      const data = [{ translationText: 'Translated text' }];
      const payload = { inputs: 'Original prompt' };

      const result = (provider as any).parseResponse(data, payload);

      expect(result.text).toBe('Translated text');
    });

    it('should handle unknown response format', () => {
      const data = { unknown: 'format' };
      const payload = { inputs: 'Original prompt' };

      const result = (provider as any).parseResponse(data, payload);

      expect(result.text).toContain('unknown');
    });

    it('should clean generated text', () => {
      const data = [{ generatedText: 'Original prompt Generated output' }];
      const payload = { inputs: 'Original prompt' };

      const result = (provider as any).parseResponse(data, payload);

      expect(result.text).toBe('Generated output');
    });
  });

  describe('cleanGeneratedText', () => {
    it('should remove original prompt from start', () => {
      const text = 'Original prompt: Generated text';
      const prompt = 'Original prompt:';

      const cleaned = (provider as any).cleanGeneratedText(text, prompt);

      expect(cleaned).toBe('Generated text');
    });

    it('should remove leading punctuation', () => {
      const text = ': - Generated text';
      const prompt = '';

      const cleaned = (provider as any).cleanGeneratedText(text, prompt);

      expect(cleaned).toBe('Generated text');
    });

    it('should normalize whitespace', () => {
      const text = 'Generated    text   with   spaces';
      const prompt = '';

      const cleaned = (provider as any).cleanGeneratedText(text, prompt);

      expect(cleaned).toBe('Generated text with spaces');
    });

    it('should trim result', () => {
      const text = '  Generated text  ';
      const prompt = '';

      const cleaned = (provider as any).cleanGeneratedText(text, prompt);

      expect(cleaned).toBe('Generated text');
    });
  });

  describe('estimateUsage', () => {
    it('should estimate token usage', () => {
      const prompt = 'This is a test prompt';
      const generated = 'This is a generated response';

      const usage = (provider as any).estimateUsage(prompt, generated);

      expect(usage.promptTokens).toBeGreaterThan(0);
      expect(usage.completionTokens).toBeGreaterThan(0);
      expect(usage.totalTokens).toBe(
        usage.promptTokens + usage.completionTokens
      );
    });

    it('should calculate roughly 4 characters per token', () => {
      const prompt = 'a'.repeat(40); // 40 chars = ~10 tokens
      const generated = 'b'.repeat(80); // 80 chars = ~20 tokens

      const usage = (provider as any).estimateUsage(prompt, generated);

      expect(usage.promptTokens).toBe(10);
      expect(usage.completionTokens).toBe(20);
      expect(usage.totalTokens).toBe(30);
    });
  });

  describe('handleApiError', () => {
    it('should log 401 error', () => {
      const error = {
        response: { status: 401, data: { error: 'Unauthorized' } },
      };
      const logSpy = jest.spyOn((provider as any).logger, 'error');

      (provider as any).handleApiError(error, 'gpt2');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('API key invalid')
      );
    });

    it('should log 429 rate limit error', () => {
      const error = {
        response: { status: 429, data: { error: 'Rate limit exceeded' } },
      };
      const logSpy = jest.spyOn((provider as any).logger, 'warn');

      (provider as any).handleApiError(error, 'gpt2');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('rate limit')
      );
    });

    it('should log 503 model loading error', () => {
      const error = {
        response: { status: 503, data: { error: 'Model loading' } },
      };
      const logSpy = jest.spyOn((provider as any).logger, 'warn');

      (provider as any).handleApiError(error, 'gpt2');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('loading'));
    });

    it('should log generic error', () => {
      const error = {
        response: { status: 500, data: { error: 'Server error' } },
        message: 'Request failed',
      };
      const logSpy = jest.spyOn((provider as any).logger, 'error');

      (provider as any).handleApiError(error, 'gpt2');

      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', () => {
      const models = provider.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models).toContain('gpt2');
      expect(models).toContain('microsoft/DialoGPT-medium');
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('isModelSupported', () => {
    it('should return true for supported model', () => {
      expect(provider.isModelSupported('gpt2')).toBe(true);
      expect(provider.isModelSupported('microsoft/DialoGPT-medium')).toBe(true);
    });

    it('should return false for unsupported model', () => {
      expect(provider.isModelSupported('unknown-model')).toBe(false);
      expect(provider.isModelSupported('gpt-4')).toBe(false);
    });
  });
});
