import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { AiLogsService } from './ai-logs.service';
import { CreateAiLogDto } from './dto/create-ai-log.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Request } from 'express';

/**
 * AiLogsController
 *
 * Small controller to create and query AI logs.
 * POST /ai-logs     -> create a log entry. If no userId in body, controller will take it from req.user (if present).
 * GET  /ai-logs     -> list logs with filters: storeId, userId, feature, limit, offset
 *
 * Protected by JwtAuthGuard; internal services can call AiLogsService.record(...) directly.
 */
@UseGuards(JwtAuthGuard)
@Controller('ai-logs')
export class AiLogsController {
  constructor(private readonly logs: AiLogsService) {}

  /**
   * Create an AI log.
   *
   * If the request is authenticated and body.userId is missing, we use req.user.id as userId.
   */
  @Post()
  async create(@Body() dto: CreateAiLogDto, @Req() req: Request) {
    const authUser = (req as any).user as any;
    const userIdFromReq = authUser?.id;

    const userId = dto.userId ?? userIdFromReq ?? undefined;

    if (!userId && !dto.storeId) {
      // allow anonymous store-level logs if necessary — here we require either a user or store for traceability
      // adjust this policy if anonymous logging is acceptable
    }

    return this.logs.record({
      userId,
      storeId: dto.storeId ?? null,
      feature: dto.feature,
      prompt: dto.prompt ?? null,
      details: dto.details ?? null,
    });
  }

  /**
   * Query logs.
   *
   * Query params:
   *  - storeId (optional)
   *  - userId (optional)
   *  - feature (optional)
   *  - limit (optional, default 100)
   *  - offset (optional, default 0)
   */
  @Get()
  async list(
    @Query('storeId') storeId?: string,
    @Query('userId') userId?: string,
    @Query('feature') feature?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 100,
    @Query('offset', new ParseIntPipe({ optional: true })) offset = 0
  ) {
    if (limit <= 0 || limit > 1000)
      throw new BadRequestException('limit must be between 1 and 1000');

    return this.logs.findByFilter({ storeId, userId, feature }, limit, offset);
  }
}
