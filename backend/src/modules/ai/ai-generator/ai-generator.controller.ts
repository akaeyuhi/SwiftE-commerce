import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AiGeneratorService } from './ai-generator.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import {
  GenerateNamesDto,
  GenerateDescriptionDto,
  GenerateIdeasDto,
  GenerateCustomDto,
  GenerationQueryDto,
  GenerateImageDto,
  GeneratePostDto,
} from './dto/generator-request.dto';
import { AiTransform } from 'src/modules/ai/decorators/ai-transform.decorator';

/**
 * AI Generator Controller
 *
 * Provides AI text generation endpoints with:
 * - Product name generation
 * - Product description generation
 * - Product idea generation
 * - Custom text generation
 * - Usage analytics and monitoring
 *
 * Security:
 * - Store users can generate content for their stores
 * - Rate limiting per user/store
 * - Content moderation and filtering
 */
@Controller('stores/:storeId/ai/generator')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
@AiTransform()
export class AiGeneratorController {
  static accessPolicies: AccessPolicies = {
    generateNames: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    generateDescription: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    generateIdeas: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },
    generateCustom: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },
    generateImage: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },
    generatePost: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },

    // Analytics endpoints
    getUsageStats: { storeRoles: [StoreRoles.ADMIN] },
    getGenerationTypes: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },

    // System endpoints - admin only
    healthCheck: { adminRole: AdminRoles.ADMIN },
  };

  constructor(private readonly generatorService: AiGeneratorService) {}

  /**
   * POST /ai/generator/names
   * Generate product names
   */
  @Post('names')
  @HttpCode(HttpStatus.OK)
  async generateNames(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: GenerateNamesDto,
    @Req() req: Request
  ) {
    const user = this.extractUser(req);

    const names = await this.generatorService.generateProductNames({
      storeStyle: dto.storeStyle,
      seed: dto.seed,
      count: dto.count || 6,
      options: dto.options || {},
      userId: user.id,
      storeId: dto.storeId || storeId,
    });

    return {
      success: true,
      data: {
        names,
        metadata: {
          count: names.length,
          storeStyle: dto.storeStyle,
          seed: dto.seed,
          generatedAt: new Date().toISOString(),
          userId: user.id,
          storeId: dto.storeId || storeId,
        },
      },
    };
  }

  /**
   * POST /ai/generator/description
   * Generate product description
   */
  @Post('description')
  @HttpCode(HttpStatus.OK)
  async generateDescription(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: GenerateDescriptionDto,
    @Req() req: Request
  ) {
    const user = this.extractUser(req);

    const description = await this.generatorService.generateProductDescription({
      name: dto.name,
      productSpec: dto.productSpec,
      tone: dto.tone || 'professional and engaging',
      options: dto.options || {},
      userId: user.id,
      storeId: dto.storeId || storeId,
    });

    return {
      success: true,
      data: {
        result: description,
        metadata: {
          productName: dto.name,
          tone: dto.tone || 'professional and engaging',
          generatedAt: new Date().toISOString(),
          userId: user.id,
          storeId: dto.storeId || storeId,
        },
      },
    };
  }

  /**
   * POST /ai/generator/ideas
   * Generate product ideas
   */
  @Post('ideas')
  @HttpCode(HttpStatus.OK)
  async generateIdeas(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: GenerateIdeasDto,
    @Req() req: Request
  ) {
    const user = this.extractUser(req);

    const ideas = await this.generatorService.generateProductIdeas({
      storeStyle: dto.storeStyle,
      seed: dto.seed,
      count: dto.count || 6,
      options: dto.options || {},
      userId: user.id,
      storeId: dto.storeId || storeId,
    });

    return {
      success: true,
      data: {
        ideas,
        metadata: {
          count: ideas.length,
          storeStyle: dto.storeStyle,
          seed: dto.seed,
          generatedAt: new Date().toISOString(),
          userId: user.id,
          storeId: dto.storeId || storeId,
        },
      },
    };
  }

  /**
   * POST /ai/generator/custom
   * Generate custom content
   */
  @Post('custom')
  @HttpCode(HttpStatus.OK)
  async generateCustom(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: GenerateCustomDto,
    @Req() req: Request
  ) {
    const user = this.extractUser(req);

    const result = await this.generatorService.generateCustom({
      prompt: dto.prompt,
      options: dto.options || {},
      userId: user.id,
      storeId: dto.storeId || storeId,
    });

    return {
      success: true,
      data: {
        result,
        metadata: {
          promptLength: dto.prompt.length,
          generatedAt: new Date().toISOString(),
          userId: user.id,
          storeId: dto.storeId || storeId,
        },
      },
    };
  }

  /**
   * POST /ai/generator/image
   * Generate image from prompt
   */
  @Post('image')
  @HttpCode(HttpStatus.OK)
  async generateImage(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: GenerateImageDto,
    @Req() req: Request
  ) {
    const user = this.extractUser(req);

    const imageUrl = await this.generatorService.generateImage({
      prompt: dto.prompt,
      userId: user.id,
      storeId,
    });

    return {
      success: true,
      data: {
        result: imageUrl,
        metadata: {
          prompt: dto.prompt,
          generatedAt: new Date().toISOString(),
          userId: user.id,
          storeId,
        },
      },
    };
  }

  /**
   * POST /ai/generator/posts
   * Generate a news post
   */
  @Post('posts')
  @HttpCode(HttpStatus.OK)
  async generatePost(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: GeneratePostDto,
    @Req() req: Request
  ) {
    const user = this.extractUser(req);

    const post = await this.generatorService.generatePost({
      topic: dto.topic,
      tone: dto.tone,
      length: dto.length,
      options: dto.options || {},
      userId: user.id,
      storeId: dto.storeId || storeId,
    });

    return {
      success: true,
      data: {
        result: post,
        metadata: {
          topic: dto.topic,
          tone: dto.tone,
          length: dto.length,
          generatedAt: new Date().toISOString(),
          userId: user.id,
          storeId: dto.storeId || storeId,
        },
      },
    };
  }

  /**
   * GET /ai/generator/types
   * Get available generation types and their configurations
   */
  @Get('types')
  async getGenerationTypes() {
    const types = this.generatorService.getGenerationTypes();

    return {
      success: true,
      data: {
        types,
        metadata: {
          count: types.length,
          retrievedAt: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * GET /stores/:storeId/ai/generator/usage
   * Get usage statistics for a store
   */
  @Get('usage')
  async getUsageStats(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: GenerationQueryDto,
    @Req() req: Request
  ) {
    const user = this.extractUser(req);

    const stats = await this.generatorService.getUsageStats({
      storeId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });

    return {
      success: true,
      data: {
        storeId,
        stats,
        metadata: {
          period: {
            from: query.dateFrom,
            to: query.dateTo,
          },
          generatedAt: new Date().toISOString(),
          userId: user.id,
        },
      },
    };
  }

  /**
   * GET /ai/generator/health
   * Health check for generator service
   */
  @Get('health')
  async healthCheck(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);
      const health = await this.generatorService.healthCheck(user.id, storeId);

      return {
        success: true,
        data: {
          service: 'ai-generator',
          ...health,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          service: 'ai-generator',
          healthy: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private extractUser(req: Request): { id: string } {
    const user = (req as any).user;
    if (!user?.id) {
      throw new BadRequestException('User context not found');
    }
    return {
      id: user.id,
    };
  }
}
