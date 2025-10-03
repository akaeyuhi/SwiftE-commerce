import { Test, TestingModule } from '@nestjs/testing';
import { AiGeneratorController } from 'src/modules/ai/ai-generator/ai-generator.controller';
import { AiGeneratorService } from 'src/modules/ai/ai-generator/ai-generator.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { BadRequestException } from '@nestjs/common';
import {
  GenerateNamesDto,
  GenerateDescriptionDto,
  GenerateIdeasDto,
  GenerateCustomDto,
  GenerationQueryDto,
} from 'src/modules/ai/ai-generator/dto/generator-request.dto';
import {
  createGuardMock,
  createMock,
  MockedMethods,
} from '../../utils/helpers';

describe('AiGeneratorController', () => {
  let controller: AiGeneratorController;
  let generatorService: Partial<MockedMethods<AiGeneratorService>>;

  const mockUser = { id: 'u1', storeId: 's1' };
  const mockRequest = { user: mockUser } as any;

  beforeEach(async () => {
    const guardMock = createGuardMock();

    generatorService = createMock<AiGeneratorService>([
      'generateProductNames',
      'generateProductDescription',
      'generateProductIdeas',
      'generateCustom',
      'getGenerationTypes',
      'getUsageStats',
      'healthCheck',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiGeneratorController],
      providers: [
        { provide: AiGeneratorService, useValue: generatorService },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<AiGeneratorController>(AiGeneratorController);

    jest.clearAllMocks();
  });

  describe('generateNames', () => {
    it('should generate product names successfully', async () => {
      const dto: GenerateNamesDto = {
        storeStyle: 'modern',
        seed: 'electronics',
        count: 6,
        storeId: 's1',
      };

      const names = ['Product A', 'Product B', 'Product C'];
      generatorService.generateProductNames!.mockResolvedValue(names);

      const result = await controller.generateNames(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.names).toEqual(names);
      expect(result.data.metadata.count).toBe(3);
      expect(result.data.metadata.userId).toBe('u1');
      expect(generatorService.generateProductNames).toHaveBeenCalledWith({
        storeStyle: 'modern',
        seed: 'electronics',
        count: 6,
        options: {},
        userId: 'u1',
        storeId: 's1',
      });
    });

    it('should use default count when not provided', async () => {
      const dto: GenerateNamesDto = {
        storeStyle: 'modern',
        seed: 'electronics',
        storeId: 's1',
      };

      generatorService.generateProductNames!.mockResolvedValue([]);

      await controller.generateNames(dto, mockRequest);

      expect(generatorService.generateProductNames).toHaveBeenCalledWith(
        expect.objectContaining({ count: 6 })
      );
    });

    it('should throw BadRequestException on service error', async () => {
      const dto: GenerateNamesDto = {
        storeStyle: 'modern',
        seed: 'electronics',
        storeId: 's1',
      };

      generatorService.generateProductNames!.mockRejectedValue(
        new Error('Generation failed')
      );

      await expect(controller.generateNames(dto, mockRequest)).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.generateNames(dto, mockRequest)).rejects.toThrow(
        'Name generation failed'
      );
    });

    it('should use user storeId when not provided in dto', async () => {
      const dto: GenerateNamesDto = {
        storeStyle: 'modern',
        seed: 'electronics',
      };

      generatorService.generateProductNames!.mockResolvedValue([]);

      await controller.generateNames(dto, mockRequest);

      expect(generatorService.generateProductNames).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: 's1' })
      );
    });
  });

  describe('generateDescription', () => {
    it('should generate product description successfully', async () => {
      const dto: GenerateDescriptionDto = {
        name: 'Wireless Headphones',
        productSpec: 'Bluetooth 5.0, 20 hour battery',
        tone: 'professional',
        storeId: 's1',
      };

      const description = {
        title: 'description',
        description: 'High-quality wireless headphones...',
      };

      generatorService.generateProductDescription!.mockResolvedValue(
        description
      );

      const result = await controller.generateDescription(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.description).toBe(description);
      expect(result.data.metadata.productName).toBe('Wireless Headphones');
    });

    it('should use default tone when not provided', async () => {
      const dto: GenerateDescriptionDto = {
        name: 'Product',
        productSpec: 'Specs',
        storeId: 's1',
      };

      const description = {
        title: 'description',
        description: 'Description',
      };

      generatorService.generateProductDescription!.mockResolvedValue(
        description
      );

      await controller.generateDescription(dto, mockRequest);

      expect(generatorService.generateProductDescription).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'professional and engaging' })
      );
    });

    it('should throw BadRequestException on service error', async () => {
      const dto: GenerateDescriptionDto = {
        name: 'Product',
        productSpec: 'Specs',
        storeId: 's1',
      };

      generatorService.generateProductDescription!.mockRejectedValue(
        new Error('API error')
      );

      await expect(
        controller.generateDescription(dto, mockRequest)
      ).rejects.toThrow('Description generation failed');
    });
  });

  describe('generateIdeas', () => {
    it('should generate product ideas successfully', async () => {
      const dto: GenerateIdeasDto = {
        storeStyle: 'eco-friendly',
        seed: 'sustainable',
        count: 5,
        storeId: 's1',
      };

      const ideas = [
        { name: 'Idea 1', concept: 'Concept 1', rationale: 'Rationale 1' },
        { name: 'Idea 2', concept: 'Concept 2', rationale: 'Rationale 2' },
        { name: 'Idea 3', concept: 'Concept 3', rationale: 'Rationale 3' },
      ];
      generatorService.generateProductIdeas!.mockResolvedValue(ideas);

      const result = await controller.generateIdeas(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.ideas).toEqual(ideas);
      expect(result.data.metadata.count).toBe(3);
    });

    it('should throw BadRequestException on error', async () => {
      const dto: GenerateIdeasDto = {
        storeStyle: 'modern',
        seed: 'tech',
        storeId: 's1',
      };

      generatorService.generateProductIdeas!.mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.generateIdeas(dto, mockRequest)).rejects.toThrow(
        'Ideas generation failed'
      );
    });
  });

  describe('generateCustom', () => {
    it('should generate custom content successfully', async () => {
      const dto: GenerateCustomDto = {
        prompt: 'Write a tagline for my store',
        storeId: 's1',
      };

      const resultText = 'Amazing products, amazing prices!';
      generatorService.generateCustom!.mockResolvedValue(resultText);

      const result = await controller.generateCustom(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.result).toBe(resultText);
      expect(result.data.metadata.promptLength).toBe(dto.prompt.length);
    });

    it('should throw BadRequestException on error', async () => {
      const dto: GenerateCustomDto = {
        prompt: 'Test prompt',
        storeId: 's1',
      };

      generatorService.generateCustom!.mockRejectedValue(new Error('Error'));

      await expect(controller.generateCustom(dto, mockRequest)).rejects.toThrow(
        'Custom generation failed'
      );
    });
  });

  describe('getGenerationTypes', () => {
    it('should return available generation types', async () => {
      const types = [
        { type: 'name', description: 'Generate product names' },
        { type: 'description', description: 'Generate descriptions' },
      ] as any;

      generatorService.getGenerationTypes!.mockReturnValue(types);

      const result = await controller.getGenerationTypes();

      expect(result.success).toBe(true);
      expect(result.data.types).toEqual(types);
      expect(result.data.metadata.count).toBe(2);
    });

    it('should handle service errors', async () => {
      generatorService.getGenerationTypes!.mockImplementation(() => {
        throw new Error('Service error');
      });

      await expect(controller.getGenerationTypes()).rejects.toThrow(
        'Failed to get generation types'
      );
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const query: GenerationQueryDto = {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      };

      const stats = {
        totalGenerations: 100,
        byType: { names: 40, descriptions: 60 },
      } as any;

      generatorService.getUsageStats!.mockResolvedValue(stats);

      const result = await controller.getUsageStats('s1', query, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.stats).toEqual(stats);
      expect(result.data.storeId).toBe('s1');
    });

    it('should handle date parsing', async () => {
      const query: GenerationQueryDto = {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      };

      generatorService.getUsageStats!.mockResolvedValue({} as any);

      await controller.getUsageStats('s1', query, mockRequest);

      expect(generatorService.getUsageStats).toHaveBeenCalledWith({
        storeId: 's1',
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-31'),
      });
    });

    it('should throw BadRequestException on error', async () => {
      generatorService.getUsageStats!.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.getUsageStats('s1', {}, mockRequest)
      ).rejects.toThrow('Failed to get usage stats');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = {
        healthy: true,
        uptime: 1000,
        providersAvailable: 2,
      } as any;

      generatorService.healthCheck!.mockResolvedValue(health);

      const result = await controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.healthy).toBe(true);
      expect(result.data.service).toBe('ai-generator');
    });

    it('should return unhealthy status on error', async () => {
      generatorService.healthCheck!.mockRejectedValue(
        new Error('Service down')
      );

      const result = await controller.healthCheck();

      expect(result.success).toBe(false);
      expect(result.data.healthy).toBe(false);
      expect(result.data.error).toBe('Service down');
    });
  });

  describe('extractUser', () => {
    it('should extract user from request', () => {
      const user = (controller as any).extractUser(mockRequest);

      expect(user.id).toBe('u1');
      expect(user.storeId).toBe('s1');
    });

    it('should throw BadRequestException when user not found', () => {
      const emptyRequest = { user: null } as any;

      expect(() => (controller as any).extractUser(emptyRequest)).toThrow(
        'User context not found'
      );
    });

    it('should throw BadRequestException when user id missing', () => {
      const invalidRequest = { user: { storeId: 's1' } } as any;

      expect(() => (controller as any).extractUser(invalidRequest)).toThrow(
        'User context not found'
      );
    });
  });
});
