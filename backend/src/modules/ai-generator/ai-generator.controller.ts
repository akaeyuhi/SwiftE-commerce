import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AiService } from './ai-generator.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

/**
 * AiController
 *
 * Simple endpoints for generating product names, descriptions, and ideas.
 * Protected by JwtAuthGuard by default; adjust as needed.
 */
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('generate/names')
  async names(
    @Body() body: { storeStyle?: string; seed?: string; modelOpts?: any }
  ) {
    const { storeStyle, seed, modelOpts } = body ?? {};
    return this.ai.generateProductNames(storeStyle, seed, modelOpts);
  }

  @Post('generate/description')
  async description(
    @Body()
    body: {
      name: string;
      spec?: string;
      tone?: string;
      modelOpts?: any;
    }
  ) {
    const { name, spec, tone, modelOpts } = body ?? {};
    if (!name) throw new BadRequestException('name is required');
    return this.ai.generateProductDescription(name, spec, tone, modelOpts);
  }

  @Post('generate/ideas')
  async ideas(
    @Body()
    body: {
      storeStyle?: string;
      seed?: string;
      count?: number;
      modelOpts?: any;
    }
  ) {
    const { storeStyle, seed, count = 6, modelOpts } = body ?? {};
    return this.ai.generateProductIdeas(storeStyle, seed, count, modelOpts);
  }
}
