// src/modules/ai/ai-generator/ai-generator.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  ValidationPipe,
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
import { StoreRole } from 'src/common/decorators/store-role.decorator';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import {
  GenerateNamesDto,
  GenerateDescriptionDto,
  GenerateIdeasDto,
  GenerateCustomDto,
  GenerationQueryDto,
} from './dto/generator-request.dto';

/**
 * Enhanced AI Generator Controller
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
@Controller('ai/generator')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class AiGeneratorController {
  static accessPolicies: AccessPolicies = {
    // Generation endpoints - store level access
    generateNames: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    generateDescription: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    generateIdeas: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },
    generateCustom: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },

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
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async generateNames(
    @Body(ValidationPipe) dto: GenerateNamesDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      const names = await this.generatorService.generateProductNames({
        storeStyle: dto.storeStyle,
        seed: dto.seed,
        count: dto.count || 6,
        options: dto.options || {},
        userId: user.id,
        storeId: dto.storeId || user.storeId,
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
            storeId: dto.storeId || user.storeId,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(`Name generation failed: ${error.message}`);
    }
  }

  /**
   * POST /ai/generator/description
   * Generate product description
   */
  @Post('description')
  @HttpCode(HttpStatus.OK)
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async generateDescription(
    @Body(ValidationPipe) dto: GenerateDescriptionDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      const description =
        await this.generatorService.generateProductDescription({
          name: dto.name,
          productSpec: dto.productSpec,
          tone: dto.tone || 'professional and engaging',
          options: dto.options || {},
          userId: user.id,
          storeId: dto.storeId || user.storeId,
        });

      return {
        success: true,
        data: {
          description,
          metadata: {
            productName: dto.name,
            tone: dto.tone || 'professional and engaging',
            generatedAt: new Date().toISOString(),
            userId: user.id,
            storeId: dto.storeId || user.storeId,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Description generation failed: ${error.message}`
      );
    }
  }

  /**
   * POST /ai/generator/ideas
   * Generate product ideas
   */
  @Post('ideas')
  @HttpCode(HttpStatus.OK)
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async generateIdeas(
    @Body(ValidationPipe) dto: GenerateIdeasDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      const ideas = await this.generatorService.generateProductIdeas({
        storeStyle: dto.storeStyle,
        seed: dto.seed,
        count: dto.count || 6,
        options: dto.options || {},
        userId: user.id,
        storeId: dto.storeId || user.storeId,
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
            storeId: dto.storeId || user.storeId,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Ideas generation failed: ${error.message}`
      );
    }
  }

  /**
   * POST /ai/generator/custom
   * Generate custom content
   */
  @Post('custom')
  @HttpCode(HttpStatus.OK)
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async generateCustom(
    @Body(ValidationPipe) dto: GenerateCustomDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      const result = await this.generatorService.generateCustom({
        prompt: dto.prompt,
        options: dto.options || {},
        userId: user.id,
        storeId: dto.storeId || user.storeId,
      });

      return {
        success: true,
        data: {
          result,
          metadata: {
            promptLength: dto.prompt.length,
            generatedAt: new Date().toISOString(),
            userId: user.id,
            storeId: dto.storeId || user.storeId,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Custom generation failed: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/generator/types
   * Get available generation types and their configurations
   */
  @Get('types')
  async getGenerationTypes() {
    try {
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
    } catch (error) {
      throw new BadRequestException(
        `Failed to get generation types: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/generator/stores/:storeId/usage
   * Get usage statistics for a store
   */
  @Get('stores/:storeId/usage')
  @StoreRole(StoreRoles.ADMIN)
  async getUsageStats(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: GenerationQueryDto,
    @Req() req: Request
  ) {
    try {
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
    } catch (error) {
      throw new BadRequestException(
        `Failed to get usage stats: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/generator/health
   * Health check for generator service
   */
  @Get('health')
  @AdminRole(AdminRoles.ADMIN)
  async healthCheck() {
    try {
      const health = await this.generatorService.healthCheck();

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

  private extractUser(req: Request): { id: string; storeId?: string } {
    const user = (req as any).user;
    if (!user?.id) {
      throw new BadRequestException('User context not found');
    }
    return {
      id: user.id,
      storeId: user.storeId,
    };
  }
}
