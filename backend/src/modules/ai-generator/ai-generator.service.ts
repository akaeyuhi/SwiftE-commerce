import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AiProvider } from 'src/common/interfaces/ai.interface';
import { TokenBucket } from './rate-limiter';

/**
 * DI token name to bind chosen provider in AiModule
 */
export const AI_PROVIDER = 'AI_PROVIDER';

/**
 * AiService
 *
 * Facade around an AiProvider implementation. It:
 *  - exposes business-level generation methods (product name, description, ideas),
 *  - enforces a simple rate limit,
 *  - centralizes prompt templates.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly limiter: TokenBucket;

  /**
   * rateLimitCapacity & refill can be configured via env:
   *  AI_RATE_CAPACITY (tokens), AI_RATE_REFILL_PER_SEC (tokens/second)
   */
  constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {
    const cap = Number(process.env.AI_RATE_CAPACITY ?? 30); // default 30 requests capacity
    const refill = Number(process.env.AI_RATE_REFILL_PER_SEC ?? 0.5); // ~30/min
    this.limiter = new TokenBucket(cap, refill);
  }

  private async checkRate() {
    if (!this.limiter.take(1)) {
      throw new BadRequestException('AI request rate limit exceeded');
    }
  }

  // ---------------- prompt templates ----------------

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

  // ---------------- public generation APIs ----------------

  /**
   * Generate several product name candidates.
   *
   * @param storeStyle - optional high-level description of the store's style/voice
   * @param seed - optional seed word(s)
   * @param opts provider options override
   */
  async generateProductNames(
    storeStyle?: string,
    seed?: string,
    opts: any = {}
  ) {
    await this.checkRate();
    const prompt = this.buildNamePrompt(storeStyle, seed);
    const res = await this.provider.generate(prompt, opts);
    try {
      return JSON.parse(res.text);
    } catch {
      return { raw: res.text };
    }
  }

  /**
   * Generate product description for a product name/spec.
   */
  async generateProductDescription(
    name: string,
    productSpec?: string,
    tone?: string,
    opts: any = {}
  ) {
    await this.checkRate();
    const prompt = this.buildDescriptionPrompt(name, productSpec, tone);
    const res = await this.provider.generate(prompt, opts);
    try {
      return JSON.parse(res.text);
    } catch {
      return { raw: res.text };
    }
  }

  /**
   * Generate product ideas list.
   * Optional `count` selection
   */
  async generateProductIdeas(
    storeStyle?: string,
    seed?: string,
    count = 6,
    opts: any = {}
  ) {
    await this.checkRate();
    const prompt = this.buildIdeasPrompt(storeStyle, seed, count);
    const res = await this.provider.generate(prompt, opts);
    try {
      return JSON.parse(res.text);
    } catch {
      return { raw: res.text };
    }
  }
}
