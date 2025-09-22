import { Injectable, Logger } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import { CreateAiLogDto } from 'src/modules/ai/ai-logs/dto/create-ai-log.dto';
import { UpdateAiLogDto } from 'src/modules/ai/ai-logs/dto/update-ai-log.dto';
import { AiLogRepository } from 'src/modules/ai/ai-logs/ai-log.repository';

/**
 * AiLogsService
 *
 * - extends BaseService for standard CRUD operations
 * - adds `record(...)` helper to create a log row conveniently from other services
 * - adds `findByFilter(...)` wrapper for filtered reads
 */
@Injectable()
export class AiLogsService extends BaseService<
  AiLog,
  CreateAiLogDto,
  UpdateAiLogDto
> {
  private readonly logger = new Logger(AiLogsService.name);

  constructor(private readonly logRepo: AiLogRepository) {
    super(logRepo);
  }

  /**
   * Create (persist) a log entry.
   *
   * @param params.userId optional user UUID — if omitted, caller should set it.
   * @param params.storeId optional store UUID
   * @param params.feature required feature name (predictor, generator-name, etc.)
   * @param params.prompt optional prompt text; will be stored inside details.prompt
   * @param params.details optional object stored in details JSONB
   *
   * Returns the saved AiLog entity.
   */
  async record(params: {
    userId?: string | null;
    storeId?: string | null;
    feature: string;
    prompt?: string | null;
    details?: Record<string, any> | null;
  }): Promise<AiLog> {
    const { userId, storeId, feature, prompt, details } = params;

    // Compose details JSON: preserve existing details and include prompt if present
    const composedDetails: Record<string, any> = { ...(details ?? {}) };
    if (prompt) composedDetails.prompt = prompt;

    const payload: any = {
      feature,
      details: Object.keys(composedDetails).length ? composedDetails : null,
    };

    if (userId) payload.user = { id: userId };
    if (storeId) payload.store = { id: storeId };

    const saved = await this.logRepo.createEntity(payload);

    this.logger.debug(
      `AiLog recorded: feature=${feature} user=${userId ?? 'n/a'} store=${storeId ?? 'n/a'}`
    );
    return saved;
  }

  /**
   * Query logs with simple filters and pagination.
   *
   * @param filter - storeId/userId/feature optional
   * @param limit - max rows (default 100)
   * @param offset - offset for pagination (default 0)
   */
  async findByFilter(
    filter: { storeId?: string; userId?: string; feature?: string },
    limit = 100,
    offset = 0
  ) {
    return this.logRepo.findByFilter(filter, limit, offset);
  }
}
