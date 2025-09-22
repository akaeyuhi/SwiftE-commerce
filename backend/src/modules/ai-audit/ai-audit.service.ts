import { Injectable, Logger } from '@nestjs/common';
import { AiAuditRepository } from './ai-audit.repository';
import { deriveKey, encryptJson } from '../ai-generator/utils/encryption';
import { AiAudit } from 'src/entities/ai/ai-audit.entity';

/**
 * AiAuditService
 *
 * Responsible for storing encrypted provider responses (audits).
 * The raw provider response is encrypted using AES-256-GCM with a key
 * derived from env var AI_AUDIT_ENC_KEY.
 */
@Injectable()
export class AiAuditService {
  private readonly logger = new Logger(AiAuditService.name);
  private readonly key: Buffer;

  constructor(private readonly repo: AiAuditRepository) {
    this.key = deriveKey(process.env.AI_AUDIT_ENC_KEY);
  }

  /**
   * Persist an encrypted audit row.
   *
   * @param params.feature - e.g. 'generator-name', 'predictor'
   * @param params.provider - provider identifier 'hf'|'openai'|'predictor'
   * @param params.model - optional model name
   * @param params.rawResponse - any serializable provider response
   * @param params.userId - optional userId for attribution
   * @param params.storeId - optional storeId for context
   */
  async storeEncryptedResponse(params: {
    feature: string;
    provider?: string | null;
    model?: string | null;
    rawResponse: any;
    userId?: string | null;
    storeId?: string | null;
  }): Promise<AiAudit> {
    const { feature, provider, model, rawResponse, userId, storeId } = params;

    // encrypt rawResponse
    const encrypted = encryptJson(rawResponse, this.key);

    const payload: any = {
      feature,
      provider: provider ?? null,
      model: model ?? null,
      encryptedResponse: encrypted,
    };

    if (userId) payload.user = { id: userId };
    if (storeId) payload.store = { id: storeId };

    const saved = await this.repo.createEntity(payload as any);
    this.logger.debug(
      `AiAudit saved id=${saved.id} feature=${feature} provider=${provider}`
    );
    return saved;
  }
}
