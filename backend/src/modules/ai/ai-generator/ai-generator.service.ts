import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  AiGenerateResult,
  AiProvider,
} from 'src/common/interfaces/ai.interface';
import { TokenBucket } from 'src/modules/ai/ai-generator/utils/rate-limiter';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';

/**
 * DI token name to bind chosen provider in AiModule
 */
export const AI_PROVIDER = 'hf';

/**
 * AiService
 *
 * Facade around an AiProvider implementation. It:
 *  - exposes business-level generation methods (product name, description, ideas),
 *  - enforces a simple rate limit,
 *  - centralizes prompt templates.
 */
@Injectable()
export class AiGeneratorService {
  private readonly logger = new Logger(AiGeneratorService.name);
  private readonly limiter: TokenBucket;

  /**
   * rateLimitCapacity & refill can be configured via env:
   *  AI_RATE_CAPACITY (tokens), AI_RATE_REFILL_PER_SEC (tokens/second)
   */
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly aiLogs: AiLogsService,
    private readonly aiAudit: AiAuditService
  ) {
    const cap = Number(process.env.AI_RATE_CAPACITY ?? 30); // default 30 requests capacity
    const refill = Number(process.env.AI_RATE_REFILL_PER_SEC ?? 0.5); // ~30/min
    this.limiter = new TokenBucket(cap, refill);
  }

  private async checkRate() {
    if (!this.limiter.take(1)) {
      throw new BadRequestException('AI request rate limit exceeded');
    }
  }

  private buildNamePrompt(
    storeStyle: string | undefined,
    seed?: string
  ): string {
    const style = storeStyle ? `Store style: ${storeStyle}.` : '';
    const s = seed ? `Seed words: ${seed}.` : '';
    return `You are a short creative product name generator.
${style}
${s}
Produce 6 short, catchy product name ideas (each 2-4 words). Provide them as a JSON array only.`;
  }

  private buildDescriptionPrompt(
    name: string,
    productSpec?: string,
    tone: string | undefined = 'friendly and concise'
  ): string {
    const spec = productSpec ? `Product specification: ${productSpec}` : '';
    return (
      `Write a product description for "${name}". ${spec} Use a ${tone} tone. Keep it 40-100 ` +
      `words. Return JSON: { "title": "<short title>", "description": "<text>" } only.`
    );
  }

  private buildIdeasPrompt(
    storeStyle: string | undefined,
    seed?: string,
    count = 6
  ): string {
    const style = storeStyle ? `Store style: ${storeStyle}.` : '';
    const s = seed ? `Seed words: ${seed}.` : '';
    return (
      `You are a product ideation assistant.
${style}
${s}
Generate ${count} product ideas that would fit this store. For each idea provide: ` +
      `{ "name": "...", "short": "one-sentence concept", ` +
      `"why": "one-sentence rationale" } and return results as a JSON array.`
    );
  }

  async generateProductNames(
    storeStyle?: string,
    seed?: string,
    opts: any = {},
    userId?: string,
    storeId?: string
  ) {
    await this.checkRate();
    const prompt = this.buildNamePrompt(storeStyle, seed);
    const res = await this.provider.generate(prompt, opts);

    await this.storeResult(
      'generator-name',
      opts,
      prompt,
      res,
      userId,
      storeId
    );

    // try parse JSON as before
    try {
      return JSON.parse(res.text);
    } catch {
      return { raw: res.text };
    }
  }

  async generateProductDescription(
    name: string,
    productSpec?: string,
    tone?: string,
    opts: any = {},
    userId?: string,
    storeId?: string
  ) {
    await this.checkRate();
    const prompt = this.buildDescriptionPrompt(name, productSpec, tone);
    const res = await this.provider.generate(prompt, opts);

    await this.storeResult(
      'generator-description',
      opts,
      prompt,
      res,
      userId,
      storeId
    );

    try {
      return JSON.parse(res.text);
    } catch {
      return { raw: res.text };
    }
  }

  async generateProductIdeas(
    storeStyle?: string,
    seed?: string,
    count = 6,
    opts: any = {},
    userId?: string,
    storeId?: string
  ) {
    await this.checkRate();
    const prompt = this.buildIdeasPrompt(storeStyle, seed, count);
    const res = await this.provider.generate(prompt, opts);

    await this.storeResult(
      'generator-ideas',
      opts,
      prompt,
      res,
      userId,
      storeId
    );

    try {
      return JSON.parse(res.text);
    } catch {
      return { raw: res.text };
    }
  }

  private async storeResult(
    feature: string,
    opts = {} as any,
    prompt: string,
    res: AiGenerateResult,
    userId?: string,
    storeId?: string
  ) {
    try {
      await this.aiLogs.record({
        userId: userId ?? null,
        storeId: storeId ?? null,
        feature,
        prompt,
        details: { model: opts?.model ?? undefined },
      });
    } catch (err) {
      this.logger.warn(err ?? 'AiLogs.record failed: ' + (err as any)?.message);
    }

    try {
      await this.aiAudit.storeEncryptedResponse({
        feature,
        provider: opts?.providerName ?? process.env.AI_PROVIDER ?? 'unknown',
        model: opts?.model ?? undefined,
        rawResponse: res.raw ?? res,
        userId: userId ?? null,
        storeId: storeId ?? null,
      });
    } catch (err) {
      this.logger.warn(
        err ?? 'AiAudit.storeEncryptedResponse failed: ' + (err as any)?.message
      );
    }
  }
}
