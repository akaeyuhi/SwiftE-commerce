import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import {
  AiGeneratorService,
  AI_PROVIDER,
} from 'src/modules/ai/ai-generator/ai-generator.service';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import {
  createMock,
  createServiceMock,
  MockedMethods,
} from '../../utils/helpers';
import { BaseAiProvider } from 'src/modules/ai/ai-generator/providers/base.provider';

describe('AiGeneratorService', () => {
  let service: AiGeneratorService;
  let provider: Partial<MockedMethods<BaseAiProvider>>;
  let aiLogsService: Partial<MockedMethods<AiLogsService>>;
  let aiAuditService: Partial<MockedMethods<AiAuditService>>;

  beforeEach(async () => {
    provider = createMock(['generate', 'healthCheck']);

    aiLogsService = createServiceMock<AiLogsService>([
      'record',
      'getUsageStats',
    ]);
    aiAuditService = createMock<AiAuditService>(['storeEncryptedResponse']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGeneratorService,
        { provide: AI_PROVIDER, useValue: provider },
        { provide: AiLogsService, useValue: aiLogsService },
        { provide: AiAuditService, useValue: aiAuditService },
      ],
    }).compile();

    service = module.get<AiGeneratorService>(AiGeneratorService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with rate limiter', () => {
      expect(service).toBeDefined();
      expect((service as any).rateLimiter).toBeDefined();
    });

    it('should load prompt templates', () => {
      const templates = (service as any).promptTemplates;
      expect(templates.size).toBeGreaterThan(0);
      expect(templates.has('productName')).toBe(true);
      expect(templates.has('productDescription')).toBe(true);
      expect(templates.has('productIdeas')).toBe(true);
      expect(templates.has('custom')).toBe(true);
    });
  });

  describe('validateRequest', () => {
    it('should validate valid request', () => {
      const request = {
        feature: 'test',
        provider: 'test',
        data: {
          type: 'name' as const,
          prompt: 'Generate names',
          options: {},
        },
      };

      expect(() => (service as any).validateRequest(request)).not.toThrow();
    });

    it('should reject invalid generation type', () => {
      const request = {
        feature: 'test',
        provider: 'test',
        data: {
          type: 'invalid' as any,
          prompt: 'Test',
          options: {},
        },
      };

      expect(() => (service as any).validateRequest(request)).toThrow(
        'Invalid generation type'
      );
    });

    it('should reject empty prompt', () => {
      const request = {
        feature: 'test',
        provider: 'test',
        data: {
          type: 'name' as const,
          prompt: '',
          options: {},
        },
      };

      expect(() => (service as any).validateRequest(request)).toThrow(
        'Prompt is required'
      );
    });

    it('should reject prompt exceeding max length', () => {
      const request = {
        feature: 'test',
        provider: 'test',
        data: {
          type: 'name' as const,
          prompt: 'a'.repeat(5001),
          options: {},
        },
      };

      expect(() => (service as any).validateRequest(request)).toThrow(
        'exceeds maximum length'
      );
    });

    it('should validate maxTokens range', () => {
      const invalidRequest = {
        feature: 'test',
        provider: 'test',
        data: {
          type: 'name' as const,
          prompt: 'Test',
          options: { maxTokens: 3000 },
        },
      };

      expect(() => (service as any).validateRequest(invalidRequest)).toThrow(
        'maxTokens must be between 1 and 2000'
      );
    });

    it('should validate temperature range', () => {
      const invalidRequest = {
        feature: 'test',
        provider: 'test',
        data: {
          type: 'name' as const,
          prompt: 'Test',
          options: { temperature: 3 },
        },
      };

      expect(() => (service as any).validateRequest(invalidRequest)).toThrow(
        'temperature must be between 0 and 2'
      );
    });

    it('should enforce rate limiting', () => {
      const request = {
        feature: 'test',
        provider: 'test',
        userId: 'rate-test-user',
        data: {
          type: 'name' as const,
          prompt: 'Test',
          options: {},
        },
      };

      // Consume rate limit
      for (let i = 0; i < 30; i++) {
        (service as any).validateRequest(request);
      }

      // Next request should fail
      expect(() => (service as any).validateRequest(request)).toThrow(
        BadRequestException
      );
    });
  });

  describe('generateProductNames', () => {
    it('should generate product names successfully', async () => {
      const names = ['Product A', 'Product B', 'Product C'];

      provider.generate!.mockResolvedValue({
        text: JSON.stringify(names),
        raw: {},
        usage: { totalTokens: 100 },
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      const result = await service.generateProductNames({
        storeStyle: 'modern',
        seed: 'electronics',
        count: 3,
        userId: 'u1',
        storeId: 's1',
      });

      expect(result).toEqual(names);
      expect(provider.generate).toHaveBeenCalled();
      expect(aiLogsService.record).toHaveBeenCalled();
    });

    it('should use default count when not provided', async () => {
      provider.generate!.mockResolvedValue({
        text: '["Name 1", "Name 2"]',
        raw: {},
        usage: {},
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      await service.generateProductNames({
        storeStyle: 'modern',
        seed: 'test',
      });

      const callArg = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(callArg).toContain('6'); // Default count
    });

    it('should handle generation failure', async () => {
      provider.generate!.mockRejectedValue(new Error('API error'));

      await expect(
        service.generateProductNames({
          storeStyle: 'modern',
          seed: 'test',
        })
      ).rejects.toThrow();
    });
  });

  describe('generateProductDescription', () => {
    it('should generate product description successfully', async () => {
      const description = {
        title: 'Amazing Product',
        description: 'This is an amazing product that does amazing things.',
      };

      provider.generate!.mockResolvedValue({
        text: JSON.stringify(description),
        raw: {},
        usage: { totalTokens: 150 },
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      const result = await service.generateProductDescription({
        name: 'Test Product',
        productSpec: 'Bluetooth, wireless',
        tone: 'professional',
        userId: 'u1',
        storeId: 's1',
      });

      expect(result).toEqual(description);
      expect(provider.generate).toHaveBeenCalled();
    });

    it('should use default tone when not provided', async () => {
      provider.generate!.mockResolvedValue({
        text: '{"title": "Test", "description": "Test desc"}',
        raw: {},
        usage: {},
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      await service.generateProductDescription({
        name: 'Test Product',
      });

      const callArg = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(callArg).toContain('friendly and professional');
    });

    it('should handle non-JSON response', async () => {
      provider.generate!.mockResolvedValue({
        text: 'Plain text response without JSON',
        raw: {},
        usage: {},
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      const result = await service.generateProductDescription({
        name: 'Test',
      });

      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
    });
  });

  describe('generateProductIdeas', () => {
    it('should generate product ideas successfully', async () => {
      const ideas = [
        { name: 'Idea 1', concept: 'Concept 1', rationale: 'Rationale 1' },
        { name: 'Idea 2', concept: 'Concept 2', rationale: 'Rationale 2' },
      ];

      provider.generate!.mockResolvedValue({
        text: JSON.stringify(ideas),
        raw: {},
        usage: { totalTokens: 200 },
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      const result = await service.generateProductIdeas({
        storeStyle: 'eco-friendly',
        seed: 'sustainable',
        count: 2,
      });

      expect(result).toEqual(ideas);
      expect(result).toHaveLength(2);
    });

    it('should filter invalid ideas', async () => {
      const mixedIdeas = [
        { name: 'Valid', concept: 'Concept', rationale: 'Rationale' },
        { name: 'Invalid' }, // Missing concept
        'string item', // Not an object
        { name: 'Valid 2', concept: 'Concept 2', rationale: 'Rationale 2' },
      ];

      provider.generate!.mockResolvedValue({
        text: JSON.stringify(mixedIdeas),
        raw: {},
        usage: {},
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      const result = await service.generateProductIdeas({
        storeStyle: 'test',
        seed: 'test',
      });

      expect(result).toHaveLength(2); // Only valid ideas
    });
  });

  describe('generateCustom', () => {
    it('should generate custom content', async () => {
      const customText = 'Custom generated content';

      provider.generate!.mockResolvedValue({
        text: customText,
        raw: {},
        usage: { totalTokens: 50 },
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      const result = await service.generateCustom({
        prompt: 'Write a tagline',
        userId: 'u1',
        storeId: 's1',
      });

      expect(result).toBe(customText);
    });

    it('should pass custom prompt directly', async () => {
      provider.generate!.mockResolvedValue({
        text: 'Result',
        raw: {},
        usage: {},
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      const customPrompt = 'My custom prompt';
      await service.generateCustom({
        prompt: customPrompt,
      });

      const callArg = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(callArg).toBe(customPrompt);
    });
  });

  describe('buildPrompt', () => {
    it('should build prompt for product names', () => {
      const prompt = (service as any).buildPrompt('name', 'Generate names', {
        storeStyle: 'modern',
        seed: 'electronics',
        count: 5,
      });

      expect(prompt).toContain('modern');
      expect(prompt).toContain('electronics');
      expect(prompt).toContain('5');
    });

    it('should build prompt for description', () => {
      const prompt = (service as any).buildPrompt(
        'description',
        'Generate desc',
        {
          productName: 'Test Product',
          productSpec: 'Bluetooth',
          tone: 'casual',
        }
      );

      expect(prompt).toContain('Test Product');
      expect(prompt).toContain('Bluetooth');
      expect(prompt).toContain('casual');
    });

    it('should build prompt for ideas', () => {
      const prompt = (service as any).buildPrompt('ideas', 'Generate ideas', {
        storeStyle: 'luxury',
        seed: 'premium',
        count: 3,
      });

      expect(prompt).toContain('luxury');
      expect(prompt).toContain('premium');
      expect(prompt).toContain('3');
    });

    it('should handle custom prompts', () => {
      const customPrompt = 'My custom prompt';
      const prompt = (service as any).buildPrompt('custom', customPrompt, {});

      expect(prompt).toBe(customPrompt);
    });

    it('should handle missing context values', () => {
      const prompt = (service as any).buildPrompt('name', 'Test', {});

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should clean up whitespace', () => {
      const prompt = (service as any).buildPrompt('name', 'Test', {
        storeStyle: '  modern  ',
        seed: '  electronics  ',
      });

      expect(prompt).not.toMatch(/\s{2,}/); // No multiple spaces
    });
  });

  describe('parseGenerationResult', () => {
    it('should parse JSON array for names', () => {
      const names = ['Name 1', 'Name 2', 'Name 3'];
      const aiResult = {
        text: JSON.stringify(names),
        raw: {},
      };

      const result = (service as any).parseGenerationResult('name', aiResult);

      expect(result).toEqual(names);
    });

    it('should parse JSON object for description', () => {
      const desc = {
        title: 'Title',
        description: 'Description text',
      };
      const aiResult = {
        text: JSON.stringify(desc),
        raw: {},
      };

      const result = (service as any).parseGenerationResult(
        'description',
        aiResult
      );

      expect(result).toEqual(desc);
    });

    it('should parse JSON array for ideas', () => {
      const ideas = [
        { name: 'Idea 1', concept: 'Concept 1', rationale: 'Why 1' },
        { name: 'Idea 2', concept: 'Concept 2', rationale: 'Why 2' },
      ];
      const aiResult = {
        text: JSON.stringify(ideas),
        raw: {},
      };

      const result = (service as any).parseGenerationResult('ideas', aiResult);

      expect(result).toEqual(ideas);
    });

    it('should handle non-JSON text for names', () => {
      const aiResult = {
        text: '1. Name One\n2. Name Two\n3. Name Three',
        raw: {},
      };

      const result = (service as any).parseGenerationResult('name', aiResult);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle non-JSON text for description', () => {
      const aiResult = {
        text: 'This is a plain text description without JSON structure.',
        raw: {},
      };

      const result = (service as any).parseGenerationResult(
        'description',
        aiResult
      );

      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it('should filter invalid items from arrays', () => {
      const mixedArray = ['valid string', 123, null, 'another valid'];
      const aiResult = {
        text: JSON.stringify(mixedArray),
        raw: {},
      };

      const result = (service as any).parseGenerationResult('name', aiResult);

      expect(result).toEqual(['valid string', 'another valid']);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      provider.healthCheck!.mockResolvedValue({
        healthy: true,
        status: 'ok',
      } as any);

      const health = await service.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.provider).toBeDefined();
      expect(health.rateLimiter).toBeDefined();
    });

    it('should return unhealthy status on error', async () => {
      provider.healthCheck!.mockRejectedValue(new Error('Provider down'));

      const health = await service.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.lastError).toBe('Provider down');
    });

    it('should handle provider without healthCheck method', async () => {
      delete provider.healthCheck;

      const health = await service.healthCheck();

      expect(health.healthy).toBe(true); // Defaults to healthy
    });
  });

  describe('getUsageStats', () => {
    it('should get usage statistics', async () => {
      const stats = {
        totalLogs: 100,
        // eslint-disable-next-line camelcase
        byFeature: { generator_names: 50, generator_description: 50 },
      } as any;

      aiLogsService.getUsageStats!.mockResolvedValue(stats);

      const result = await service.getUsageStats({ storeId: 's1' });

      expect(result).toEqual(stats);
      expect(aiLogsService.getUsageStats).toHaveBeenCalledWith({
        storeId: 's1',
      });
    });
  });

  describe('getGenerationTypes', () => {
    it('should return all generation types', () => {
      const types = service.getGenerationTypes();

      expect(types).toHaveLength(4);
      expect(types.map((t) => t.type)).toContain('name');
      expect(types.map((t) => t.type)).toContain('description');
      expect(types.map((t) => t.type)).toContain('ideas');
      expect(types.map((t) => t.type)).toContain('custom');
    });

    it('should include descriptions and default options', () => {
      const types = service.getGenerationTypes();

      types.forEach((type) => {
        expect(type.description).toBeDefined();
        expect(type.defaultOptions).toBeDefined();
        expect(type.defaultOptions.maxTokens).toBeGreaterThan(0);
      });
    });
  });

  describe('processRequest', () => {
    it('should process request successfully', async () => {
      const request = {
        feature: 'test',
        provider: 'test',
        data: {
          type: 'name' as const,
          prompt: 'Generate names',
          options: {},
          context: { count: 3 },
        },
      };

      provider.generate!.mockResolvedValue({
        text: '["Name 1", "Name 2", "Name 3"]',
        raw: {},
        usage: { totalTokens: 100 },
      });

      const response = await (service as any).processRequest(request);

      expect(response.success).toBe(true);
      expect(response.result.type).toBe('name');
      expect(response.result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should merge options with template defaults', async () => {
      const request = {
        feature: 'test',
        provider: 'test',
        data: {
          type: 'name' as const,
          prompt: 'Test',
          options: { temperature: 0.5 },
          context: {},
        },
      };

      provider.generate!.mockResolvedValue({
        text: '["Name"]',
        raw: {},
        usage: {},
      });

      await (service as any).processRequest(request);

      const callOptions = (provider.generate as jest.Mock).mock.calls[0][1];
      expect(callOptions.temperature).toBe(0.5);
      expect(callOptions.maxTokens).toBeDefined(); // From template defaults
    });

    it('should handle processing errors', async () => {
      const request = {
        feature: 'test',
        provider: 'test',
        data: {
          type: 'name' as const,
          prompt: 'Test',
          options: {},
          context: {},
        },
      };

      provider.generate!.mockRejectedValue(new Error('Processing failed'));

      await expect((service as any).processRequest(request)).rejects.toThrow(
        'Processing failed'
      );
    });
  });

  describe('logUsage', () => {
    it('should log usage with details', async () => {
      const request = {
        feature: 'generator_names',
        provider: 'test',
        userId: 'u1',
        storeId: 's1',
        data: {
          type: 'name' as const,
          prompt: 'Test',
          options: {},
          context: {},
        },
      };

      const response = {
        success: true,
        text: 'Result',
        raw: {},
        usage: { totalTokens: 100 },
        result: {
          type: 'name',
          result: ['Name'],
          raw: 'Raw',
          metadata: { processingTime: 500, tokensUsed: 100 },
        },
        feature: 'generator_names',
        provider: 'test',
      };

      aiLogsService.record!.mockResolvedValue({} as any);

      await (service as any).logUsage(request, response);

      expect(aiLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          storeId: 's1',
          feature: 'generator_names',
          prompt: 'Test',
          details: expect.objectContaining({
            generationType: 'name',
            success: true,
          }),
        })
      );
    });
  });

  describe('auditRequest', () => {
    it('should audit request with encrypted response', async () => {
      const request = {
        feature: 'generator_names',
        provider: 'test',
        userId: 'u1',
        storeId: 's1',
        data: {
          type: 'name' as const,
          prompt: 'Test',
          options: { model: 'gpt-3.5-turbo' },
          context: {},
        },
      };

      const response = {
        success: true,
        text: 'Result',
        raw: {},
        result: {},
        feature: 'generator_names',
        provider: 'test',
      };

      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      await (service as any).auditRequest(request, response);

      expect(aiAuditService.storeEncryptedResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'generator_names',
          provider: 'ai_generator',
          model: 'gpt-3.5-turbo',
          userId: 'u1',
          storeId: 's1',
        })
      );
    });
  });

  describe('rate limiting', () => {
    it('should allow requests within limit', async () => {
      provider.generate!.mockResolvedValue({
        text: '["Name"]',
        raw: {},
        usage: {},
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      // Should succeed for multiple requests
      for (let i = 0; i < 10; i++) {
        await service.generateProductNames({
          storeStyle: 'test',
          seed: 'test',
          userId: `user${i}`, // Different users
        });
      }

      expect(provider.generate).toHaveBeenCalledTimes(10);
    });

    it('should reject requests exceeding rate limit', async () => {
      const params = {
        storeStyle: 'test',
        seed: 'test',
        userId: 'rate-limit-test',
      };

      provider.generate!.mockResolvedValue({
        text: '["Name"]',
        raw: {},
        usage: {},
      });

      aiLogsService.record!.mockResolvedValue({} as any);
      aiAuditService.storeEncryptedResponse!.mockResolvedValue({} as any);

      // Consume rate limit
      for (let i = 0; i < 30; i++) {
        await service.generateProductNames(params);
      }

      // Next should fail
      await expect(service.generateProductNames(params)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
